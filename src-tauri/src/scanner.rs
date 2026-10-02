use crate::dto::{ScanWarningDto, ScannedFileDto};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

/// Directory names we never descend into: they belong to other scan categories
/// (developer tooling) or are simply not useful for a storage-cleanup listing.
const SKIP_DIR_NAMES: &[&str] = &[
    "node_modules",
    ".git",
    ".Trash",
    "Library",
    ".cache",
];

/// macOS "package" directories that look like folders but are managed as a
/// single document by their owning app. Removing an individual file from
/// inside one (e.g. an original photo inside a Photos library) corrupts the
/// library, so the file scanner never descends into them — they're only
/// ever sized as a whole, elsewhere.
const SKIP_PACKAGE_SUFFIXES: &[&str] = &[
    ".photoslibrary",
    ".photolibrary",
    ".imovielibrary",
    ".fcpbundle",
    ".musiclibrary",
    ".tvlibrary",
    ".theater",
    ".app",
    ".bundle",
    ".framework",
    ".xcodeproj",
    ".xcworkspace",
    ".logicx",
    ".band",
    ".lrlibrary",
    ".lrdata",
];

/// Upper bound on how many matching files are collected before sorting —
/// purely a memory guard; real scans of Downloads/Documents are far below it.
const COLLECT_CAP: usize = 50_000;

pub(crate) fn is_skipped_dir_name(name: &str) -> bool {
    if SKIP_DIR_NAMES.contains(&name) {
        return true;
    }
    let lower = name.to_lowercase();
    SKIP_PACKAGE_SUFFIXES.iter().any(|suffix| lower.ends_with(suffix))
}

pub fn system_time_to_ms(time: SystemTime) -> Option<u64> {
    time.duration_since(UNIX_EPOCH).ok().map(|d| d.as_millis() as u64)
}

/// Recursively sums the size of every file under `path`. Permission errors on
/// individual subdirectories are skipped rather than aborting the whole walk.
pub fn dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    WalkDir::new(path)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| entry.metadata().ok())
        .map(|meta| meta.len())
        .sum()
}

/// Like `dir_size`, but counts *allocated* disk blocks instead of logical
/// length — what the storage breakdown needs, since iCloud "optimized"
/// placeholders and sparse files report a large logical size while using
/// little or no actual disk space.
pub fn dir_allocated_size(path: &Path) -> u64 {
    use std::os::unix::fs::MetadataExt;
    if !path.exists() {
        return 0;
    }
    WalkDir::new(path)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| entry.metadata().ok())
        .map(|meta| meta.blocks() * 512)
        .sum()
}

/// "accessible" | "denied" | "not-found"
pub fn path_access_state(path: &Path) -> &'static str {
    if !path.exists() {
        return "not-found";
    }
    match std::fs::read_dir(path) {
        Ok(_) => "accessible",
        Err(err) if err.kind() == std::io::ErrorKind::PermissionDenied => "denied",
        Err(_) => "denied",
    }
}

/// Walks `root` up to `max_depth` levels, returning the `max_results`
/// *largest* files that are at least `min_size_bytes` large. Skips
/// directories in `SKIP_DIR_NAMES`, app-managed packages (see
/// `SKIP_PACKAGE_SUFFIXES`), and any individual entry that errors
/// (permission issues, broken symlinks, etc).
pub fn scan_candidate_files(
    root: &Path,
    root_label: &str,
    max_depth: usize,
    min_size_bytes: u64,
    max_results: usize,
) -> (Vec<ScannedFileDto>, Option<ScanWarningDto>) {
    if !root.exists() {
        return (
            Vec::new(),
            Some(ScanWarningDto {
                path: root.to_string_lossy().to_string(),
                message: "Location not found on this Mac.".to_string(),
            }),
        );
    }

    if std::fs::read_dir(root).is_err() {
        return (
            Vec::new(),
            Some(ScanWarningDto {
                path: root.to_string_lossy().to_string(),
                message: "Permission denied — this Mac may require Full Disk Access to read this location.".to_string(),
            }),
        );
    }

    let mut results = Vec::new();

    let walker = WalkDir::new(root)
        .max_depth(max_depth)
        .into_iter()
        .filter_entry(|entry| {
            if entry.depth() > 0 && entry.file_type().is_dir() {
                let name = entry.file_name().to_string_lossy();
                return !is_skipped_dir_name(name.as_ref());
            }
            true
        });

    for entry in walker {
        if results.len() >= COLLECT_CAP {
            break;
        }
        let Ok(entry) = entry else { continue };
        if !entry.file_type().is_file() {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        if meta.len() < min_size_bytes {
            continue;
        }

        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let extension = path
            .extension()
            .map(|ext| ext.to_string_lossy().to_lowercase());

        results.push(ScannedFileDto {
            name,
            path: path.to_string_lossy().to_string(),
            size_bytes: meta.len(),
            modified_ms: meta.modified().ok().and_then(system_time_to_ms),
            accessed_ms: meta.accessed().ok().and_then(system_time_to_ms),
            extension,
            root: root_label.to_string(),
            duplicate_group: None,
        });
    }

    results.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    results.truncate(max_results);
    (results, None)
}

/// For directories like `~/Library/Caches` or `~/Library/Logs` that hold
/// thousands of small files across hundreds of per-app subfolders: rather than
/// listing every file, this sizes each *top-level* entry as one unit (e.g. one
/// row per app's cache folder) and returns the largest ones.
pub fn scan_top_level_sizes(
    root: &Path,
    root_label: &str,
    min_size_bytes: u64,
    max_results: usize,
) -> (Vec<ScannedFileDto>, Option<ScanWarningDto>) {
    if !root.exists() {
        return (
            Vec::new(),
            Some(ScanWarningDto {
                path: root.to_string_lossy().to_string(),
                message: "Location not found on this Mac.".to_string(),
            }),
        );
    }

    let entries = match std::fs::read_dir(root) {
        Ok(entries) => entries,
        Err(_) => {
            return (
                Vec::new(),
                Some(ScanWarningDto {
                    path: root.to_string_lossy().to_string(),
                    message: "Permission denied — this Mac may require Full Disk Access to read this location.".to_string(),
                }),
            );
        }
    };

    let mut results = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else { continue };
        let size_bytes = if file_type.is_dir() {
            dir_size(&path)
        } else {
            entry.metadata().map(|m| m.len()).unwrap_or(0)
        };
        if size_bytes < min_size_bytes {
            continue;
        }
        let modified_ms = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(system_time_to_ms);

        results.push(ScannedFileDto {
            name: entry.file_name().to_string_lossy().to_string(),
            path: path.to_string_lossy().to_string(),
            size_bytes,
            modified_ms,
            accessed_ms: None,
            extension: None,
            root: root_label.to_string(),
            duplicate_group: None,
        });
    }

    results.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    results.truncate(max_results);
    (results, None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn scratch(label: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("macbook-cleaner-scanner-{label}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn never_descends_into_app_managed_libraries() {
        let root = scratch("packages");
        let lib = root.join("Photos Library.photoslibrary").join("originals");
        fs::create_dir_all(&lib).unwrap();
        fs::write(lib.join("IMG_0001.heic"), vec![0u8; 4096]).unwrap();
        fs::write(root.join("loose.mov"), vec![0u8; 4096]).unwrap();

        let (found, warning) = scan_candidate_files(&root, "movies", 6, 1, 100);
        assert!(warning.is_none());
        let names: Vec<_> = found.iter().map(|f| f.name.as_str()).collect();
        assert_eq!(names, vec!["loose.mov"], "files inside a .photoslibrary must never be listed");
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn returns_the_largest_files_not_the_first_found() {
        let root = scratch("largest");
        for (name, size) in [("a.bin", 10usize), ("b.bin", 3000), ("c.bin", 20), ("d.bin", 2000)] {
            fs::write(root.join(name), vec![0u8; size]).unwrap();
        }
        let (found, _) = scan_candidate_files(&root, "downloads", 2, 1, 2);
        let names: Vec<_> = found.iter().map(|f| f.name.as_str()).collect();
        assert_eq!(names, vec!["b.bin", "d.bin"]);
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn skip_matching_is_case_insensitive_for_packages() {
        assert!(is_skipped_dir_name("My Movie.iMovieLibrary"));
        assert!(is_skipped_dir_name("node_modules"));
        assert!(!is_skipped_dir_name("Projects"));
    }
}
