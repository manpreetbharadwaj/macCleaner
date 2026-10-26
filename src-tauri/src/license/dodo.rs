//! Talks to Dodo Payments' public license endpoints — activate, validate,
//! deactivate. All three are documented as public (no API key required),
//! which is the whole reason this app never needs to store a secret Dodo
//! merchant API key anywhere.
//!
//! Response parsing is split out as plain functions over a status code +
//! body string, independent of the actual `reqwest` call, so the decision
//! logic (what a 403 vs 404 vs 422 means) is unit-testable without a mock
//! HTTP server or any network access.

use super::config::DODO_API_BASE;
use std::time::Duration;

const TIMEOUT: Duration = Duration::from_secs(10);

pub enum ActivateOutcome {
    Activated { instance_id: String },
    /// The key exists but isn't active (e.g. not yet paid, or disabled).
    NotActive,
    NotFound,
    LimitReached,
    /// Couldn't reach Dodo, or it returned something unexpected.
    Error(String),
}

pub enum ValidateOutcome {
    Valid,
    Invalid,
    Error(String),
}

pub enum DeactivateOutcome {
    Deactivated,
    /// Already gone (unknown key, or an instance that no longer belongs to
    /// it) — treated the same way by the caller: clear local credentials.
    NotFound,
    Error(String),
}

pub fn parse_activate_response(status: u16, body: &str) -> ActivateOutcome {
    match status {
        200 | 201 => match serde_json::from_str::<serde_json::Value>(body).ok().and_then(|v| v.get("id").and_then(|id| id.as_str()).map(str::to_string)) {
            Some(instance_id) => ActivateOutcome::Activated { instance_id },
            None => ActivateOutcome::Error("Dodo's activation response was missing an instance id".to_string()),
        },
        403 => ActivateOutcome::NotActive,
        404 => ActivateOutcome::NotFound,
        422 => ActivateOutcome::LimitReached,
        other => ActivateOutcome::Error(format!("Dodo returned an unexpected status while activating: {other}")),
    }
}

pub fn parse_validate_response(status: u16, body: &str) -> ValidateOutcome {
    match status {
        200 => match serde_json::from_str::<serde_json::Value>(body).ok().and_then(|v| v.get("valid").and_then(|v| v.as_bool())) {
            Some(true) => ValidateOutcome::Valid,
            Some(false) => ValidateOutcome::Invalid,
            None => ValidateOutcome::Error("Dodo's validation response had no `valid` field".to_string()),
        },
        404 => ValidateOutcome::Invalid,
        other => ValidateOutcome::Error(format!("Dodo returned an unexpected status while validating: {other}")),
    }
}

pub fn parse_deactivate_response(status: u16) -> DeactivateOutcome {
    match status {
        200 | 204 => DeactivateOutcome::Deactivated,
        403 | 404 => DeactivateOutcome::NotFound,
        other => DeactivateOutcome::Error(format!("Dodo returned an unexpected status while deactivating: {other}")),
    }
}

async fn post(path: &str, body: serde_json::Value) -> Result<(u16, String), String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{DODO_API_BASE}{path}"))
        .json(&body)
        .timeout(TIMEOUT)
        .send()
        .await
        .map_err(|e| format!("Couldn't reach Dodo Payments: {e}"))?;
    let status = response.status().as_u16();
    let text = response.text().await.unwrap_or_default();
    Ok((status, text))
}

pub async fn activate(license_key: &str, name: &str) -> ActivateOutcome {
    match post("/licenses/activate", serde_json::json!({ "license_key": license_key, "name": name })).await {
        Ok((status, body)) => parse_activate_response(status, &body),
        Err(e) => ActivateOutcome::Error(e),
    }
}

pub async fn validate(license_key: &str, instance_id: &str) -> ValidateOutcome {
    match post("/licenses/validate", serde_json::json!({ "license_key": license_key, "license_key_instance_id": instance_id })).await {
        Ok((status, body)) => parse_validate_response(status, &body),
        Err(e) => ValidateOutcome::Error(e),
    }
}

pub async fn deactivate(license_key: &str, instance_id: &str) -> DeactivateOutcome {
    match post("/licenses/deactivate", serde_json::json!({ "license_key": license_key, "license_key_instance_id": instance_id })).await {
        Ok((status, _)) => parse_deactivate_response(status),
        Err(e) => DeactivateOutcome::Error(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn activate_reads_the_instance_id() {
        match parse_activate_response(200, r#"{"id":"lki_abc123"}"#) {
            ActivateOutcome::Activated { instance_id } => assert_eq!(instance_id, "lki_abc123"),
            _ => panic!("expected Activated"),
        }
    }

    #[test]
    fn activate_maps_known_error_statuses() {
        assert!(matches!(parse_activate_response(403, ""), ActivateOutcome::NotActive));
        assert!(matches!(parse_activate_response(404, ""), ActivateOutcome::NotFound));
        assert!(matches!(parse_activate_response(422, ""), ActivateOutcome::LimitReached));
    }

    #[test]
    fn activate_rejects_a_200_with_no_id() {
        assert!(matches!(parse_activate_response(200, "{}"), ActivateOutcome::Error(_)));
        assert!(matches!(parse_activate_response(200, "not json"), ActivateOutcome::Error(_)));
    }

    #[test]
    fn validate_reads_the_valid_flag() {
        assert!(matches!(parse_validate_response(200, r#"{"valid":true}"#), ValidateOutcome::Valid));
        assert!(matches!(parse_validate_response(200, r#"{"valid":false}"#), ValidateOutcome::Invalid));
    }

    #[test]
    fn validate_treats_a_missing_key_as_invalid_not_an_error() {
        assert!(matches!(parse_validate_response(404, ""), ValidateOutcome::Invalid));
    }

    #[test]
    fn deactivate_treats_403_and_404_as_already_gone() {
        assert!(matches!(parse_deactivate_response(403), DeactivateOutcome::NotFound));
        assert!(matches!(parse_deactivate_response(404), DeactivateOutcome::NotFound));
        assert!(matches!(parse_deactivate_response(200), DeactivateOutcome::Deactivated));
        assert!(matches!(parse_deactivate_response(204), DeactivateOutcome::Deactivated));
    }

    #[test]
    fn unexpected_statuses_are_errors_not_silently_treated_as_success() {
        assert!(matches!(parse_activate_response(500, ""), ActivateOutcome::Error(_)));
        assert!(matches!(parse_validate_response(500, ""), ValidateOutcome::Error(_)));
        assert!(matches!(parse_deactivate_response(500), DeactivateOutcome::Error(_)));
    }
}
