use crate::dto::ScannedFileDto;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};

const SAMPLE_BYTES: u64 = 64 * 1024;
const READ_CHUNK: usize = 1024 * 1024;

/// Cheap duplicate-candidate fingerprint: file size plus a hash of the first
/// and last 64KB. This never reads a whole large file, only a few KB
/// regardless of size — it's the first, fast filter. Files that share a
/// fingerprint are then confirmed with `full_hash` before ever being
/// reported as duplicates.
fn fingerprint(path: &str, size: u64) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut hasher = Sha256::new();
    hasher.update(size.to_le_bytes());

    let mut head = vec![0u8; SAMPLE_BYTES.min(size) as usize];
    file.read_exact(&mut head).ok()?;
    hasher.update(&head);

    if size > SAMPLE_BYTES {
        let tail_len = SAMPLE_BYTES.min(size) as usize;
        file.seek(SeekFrom::End(-(tail_len as i64))).ok()?;
        let mut tail = vec![0u8; tail_len];
        file.read_exact(&mut tail).ok()?;
        hasher.update(&tail);
    }

    Some(format!("{:x}", hasher.finalize()))
}

/// Streams the entire file through SHA-256 in 1MB chunks (constant memory
/// regardless of file size). Only ever called for files that already share
/// an exact size *and* a head/tail fingerprint with at least one other file,
/// so unique files are never fully read.
fn full_hash(path: &str) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; READ_CHUNK];
    loop {
        let n = file.read(&mut buf).ok()?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Some(format!("{:x}", hasher.finalize()))
}

/// Three-stage duplicate detection, each stage only run on what survived the
/// previous one:
///   1. group by exact byte size (free — already known from the scan),
///   2. group by head/tail fingerprint (reads ≤128KB per file),
///   3. confirm with a full-content SHA-256 (reads the whole file).
/// Only files whose *entire contents* are byte-identical end up sharing a
/// `duplicate_group` id.
pub fn mark_duplicate_candidates(files: &mut [ScannedFileDto]) {
    let mut by_size: HashMap<u64, Vec<usize>> = HashMap::new();
    for (idx, file) in files.iter().enumerate() {
        if file.size_bytes == 0 {
            continue;
        }
        by_size.entry(file.size_bytes).or_default().push(idx);
    }

    let mut group_counter = 0usize;

    for (_, indices) in by_size.into_iter().filter(|(_, idxs)| idxs.len() > 1) {
        let mut by_fingerprint: HashMap<String, Vec<usize>> = HashMap::new();
        for idx in indices {
            let (path, size) = (files[idx].path.clone(), files[idx].size_bytes);
            if let Some(fp) = fingerprint(&path, size) {
                by_fingerprint.entry(fp).or_default().push(idx);
            }
        }

        for (_, candidates) in by_fingerprint.into_iter().filter(|(_, idxs)| idxs.len() > 1) {
            let mut by_full: HashMap<String, Vec<usize>> = HashMap::new();
            for idx in candidates {
                if let Some(hash) = full_hash(&files[idx].path) {
                    by_full.entry(hash).or_default().push(idx);
                }
            }

            for (_, confirmed) in by_full.into_iter().filter(|(_, idxs)| idxs.len() > 1) {
                group_counter += 1;
                let group_id = format!("dup-{group_counter}");
                for idx in confirmed {
                    files[idx].duplicate_group = Some(group_id.clone());
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn scratch(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("macbook-cleaner-dedup-{label}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn dto(path: &PathBuf) -> ScannedFileDto {
        ScannedFileDto {
            name: path.file_name().unwrap().to_string_lossy().to_string(),
            path: path.to_string_lossy().to_string(),
            size_bytes: fs::metadata(path).unwrap().len(),
            modified_ms: None,
            accessed_ms: None,
            extension: None,
            root: "downloads".to_string(),
            duplicate_group: None,
        }
    }

    #[test]
    fn identical_files_are_grouped() {
        let dir = scratch("identical");
        let content = vec![7u8; 300 * 1024];
        fs::write(dir.join("a.bin"), &content).unwrap();
        fs::write(dir.join("b.bin"), &content).unwrap();
        let mut files = vec![dto(&dir.join("a.bin")), dto(&dir.join("b.bin"))];
        mark_duplicate_candidates(&mut files);
        assert!(files[0].duplicate_group.is_some());
        assert_eq!(files[0].duplicate_group, files[1].duplicate_group);
        fs::remove_dir_all(&dir).ok();
    }

    /// The case the old fingerprint-only approach got wrong: same size, same
    /// first and last 64KB, different middle. Must NOT be reported.
    #[test]
    fn same_head_and_tail_but_different_middle_is_not_a_duplicate() {
        let dir = scratch("middle");
        let mut a = vec![1u8; 512 * 1024];
        let mut b = a.clone();
        a[256 * 1024] = 2;
        b[256 * 1024] = 3;
        fs::write(dir.join("a.bin"), &a).unwrap();
        fs::write(dir.join("b.bin"), &b).unwrap();
        let mut files = vec![dto(&dir.join("a.bin")), dto(&dir.join("b.bin"))];
        mark_duplicate_candidates(&mut files);
        assert!(files[0].duplicate_group.is_none(), "files differing only in the middle must not be grouped");
        assert!(files[1].duplicate_group.is_none());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn different_sizes_are_never_hashed_or_grouped() {
        let dir = scratch("sizes");
        fs::write(dir.join("a.bin"), vec![0u8; 100]).unwrap();
        fs::write(dir.join("b.bin"), vec![0u8; 101]).unwrap();
        let mut files = vec![dto(&dir.join("a.bin")), dto(&dir.join("b.bin"))];
        mark_duplicate_candidates(&mut files);
        assert!(files.iter().all(|f| f.duplicate_group.is_none()));
        fs::remove_dir_all(&dir).ok();
    }
}
