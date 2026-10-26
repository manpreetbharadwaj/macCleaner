//! Opens a web link in the user's default browser, but only for URLs we
//! trust. The WebView cannot follow external links itself (Tauri blocks
//! navigation away from the app), so every https link goes through here.

use url::Url;

/// Hosts the app may open. Deliberately tiny: the product website, plus
/// Dodo Payments' checkout for the "Buy Lifetime License" button — a static,
/// no-API-key payment link (see license/mod.rs's `license_open_purchase_page`
/// and license/config.rs's `DODO_CHECKOUT_HOST`).
///
/// Mirrors `DODO_CHECKOUT_HOST`'s own test/live split exactly, and for the
/// same reason: a normal (non-`dodo_test_mode`) build — which is every
/// release build, since that feature isn't in `default` — must not even be
/// *capable* of opening the sandbox checkout host, regardless of what URL
/// anything in the app might ever try to pass here.
#[cfg(feature = "dodo_test_mode")]
const ALLOWED_HOSTS: &[&str] = &["macbookcleaner.app", "www.macbookcleaner.app", "test.checkout.dodopayments.com"];
#[cfg(not(feature = "dodo_test_mode"))]
const ALLOWED_HOSTS: &[&str] = &["macbookcleaner.app", "www.macbookcleaner.app", "checkout.dodopayments.com"];

pub fn validate(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw.trim()).map_err(|e| format!("Not a valid URL: {e}"))?;
    if url.scheme() != "https" {
        return Err("Only https links can be opened.".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("Links containing credentials are not allowed.".to_string());
    }
    if url.port().is_some() {
        return Err("Links with a custom port are not allowed.".to_string());
    }
    let host = url.host_str().ok_or_else(|| "The link has no host.".to_string())?;
    if !ALLOWED_HOSTS.contains(&host) {
        return Err(format!("{host} is not an allowed destination."));
    }
    Ok(url)
}

pub fn open(raw: &str) -> Result<(), String> {
    let url = validate(raw).inspect_err(|e| log::warn!("Refused to open external link: {e}"))?;
    match std::process::Command::new("/usr/bin/open").arg(url.as_str()).status() {
        Ok(status) if status.success() => {
            log::info!("Opened {} in the default browser", url.as_str());
            Ok(())
        }
        Ok(status) => {
            log::error!("/usr/bin/open exited with {status} for {}", url.as_str());
            Err("macOS could not open the link in your default browser.".to_string())
        }
        Err(e) => {
            log::error!("Failed to launch /usr/bin/open for {}: {e}", url.as_str());
            Err(format!("Could not open your default browser: {e}"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_the_product_site() {
        assert!(validate("https://macbookcleaner.app").is_ok());
        assert!(validate("https://macbookcleaner.app/download#how-to-open").is_ok());
        assert!(validate("  https://macbookcleaner.app/faq  ").is_ok());
    }

    #[test]
    #[cfg(not(feature = "dodo_test_mode"))]
    fn accepts_the_live_dodo_checkout_link() {
        assert!(validate("https://checkout.dodopayments.com/buy/pdt_123?quantity=1").is_ok());
    }

    #[test]
    #[cfg(not(feature = "dodo_test_mode"))]
    fn a_live_build_refuses_the_sandbox_checkout_host() {
        assert!(validate("https://test.checkout.dodopayments.com/buy/pdt_0NqQ5ZKXDNgbggDrQaV2d?quantity=1").is_err(), "a live build must never be able to open the sandbox checkout host");
    }

    #[test]
    #[cfg(feature = "dodo_test_mode")]
    fn accepts_the_sandbox_dodo_checkout_link() {
        assert!(validate("https://test.checkout.dodopayments.com/buy/pdt_0NqQ5ZKXDNgbggDrQaV2d?quantity=1").is_ok());
    }

    #[test]
    #[cfg(feature = "dodo_test_mode")]
    fn a_sandbox_build_refuses_the_live_checkout_host() {
        assert!(validate("https://checkout.dodopayments.com/buy/pdt_123?quantity=1").is_err(), "a dodo_test_mode build must never be able to open the live checkout host");
    }

    #[test]
    fn rejects_unsafe_or_unlisted_urls() {
        for bad in [
            "http://macbookcleaner.app/",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "x-apple.systempreferences:com.apple.preference.security",
            "https://evil.example/phish",
            "https://macbookcleaner.app.evil.example/",
            "https://macbookcleaner.app@evil.example/",
            "https://user:pw@macbookcleaner.app/",
            "https://macbookcleaner.app:8443/",
            "https://checkout.dodopayments.com.evil.example/",
            "https://checkout.dodopayments.com@evil.example/",
            "https://evil.example/checkout.dodopayments.com",
            "https://test.checkout.dodopayments.com.evil.example/",
            "https://test.checkout.dodopayments.com@evil.example/",
            "https://evil.example/test.checkout.dodopayments.com",
            "-a Calculator",
            "",
            "not a url",
        ] {
            assert!(validate(bad).is_err(), "should have rejected {bad:?}");
        }
    }
}
