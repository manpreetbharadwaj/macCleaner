//! Thin, allocation-light wrappers over `sysctlbyname`. Every read here is
//! unprivileged and served from kernel memory — no processes are spawned.

use std::ffi::CString;
use std::mem;

/// Reads a fixed-size value (integer, struct) by name. None if the key
/// doesn't exist on this Mac or the size doesn't match.
pub fn read<T: Copy>(name: &str) -> Option<T> {
    let cname = CString::new(name).ok()?;
    let mut value = mem::MaybeUninit::<T>::uninit();
    let mut size = mem::size_of::<T>();
    // SAFETY: `value` is a properly sized, writable buffer for T and `size`
    // tells the kernel exactly how large it is; we only assume it was
    // initialized when the call succeeded and filled exactly size_of::<T>().
    let rc = unsafe { libc::sysctlbyname(cname.as_ptr(), value.as_mut_ptr().cast(), &mut size, std::ptr::null_mut(), 0) };
    if rc != 0 || size != mem::size_of::<T>() {
        return None;
    }
    Some(unsafe { value.assume_init() })
}

pub fn read_u64(name: &str) -> Option<u64> {
    // Some integer keys are 32-bit, some 64-bit; ask for the size first.
    let cname = CString::new(name).ok()?;
    let mut size = 0usize;
    // SAFETY: a null output buffer asks only for the value's size.
    let rc = unsafe { libc::sysctlbyname(cname.as_ptr(), std::ptr::null_mut(), &mut size, std::ptr::null_mut(), 0) };
    if rc != 0 {
        return None;
    }
    match size {
        4 => read::<u32>(name).map(u64::from),
        8 => read::<u64>(name),
        _ => None,
    }
}

pub fn read_string(name: &str) -> Option<String> {
    let cname = CString::new(name).ok()?;
    let mut size = 0usize;
    // SAFETY: size query, then a read into a buffer of exactly that size.
    unsafe {
        if libc::sysctlbyname(cname.as_ptr(), std::ptr::null_mut(), &mut size, std::ptr::null_mut(), 0) != 0 || size == 0 {
            return None;
        }
        let mut buf = vec![0u8; size];
        if libc::sysctlbyname(cname.as_ptr(), buf.as_mut_ptr().cast(), &mut size, std::ptr::null_mut(), 0) != 0 {
            return None;
        }
        buf.truncate(size);
        while buf.last() == Some(&0) {
            buf.pop();
        }
        let s = String::from_utf8_lossy(&buf).trim().to_string();
        (!s.is_empty()).then_some(s)
    }
}

/// Wall-clock boot time in milliseconds since the Unix epoch (`kern.boottime`).
pub fn boot_time_ms() -> Option<u64> {
    let tv: libc::timeval = read("kern.boottime")?;
    if tv.tv_sec <= 0 {
        return None;
    }
    Some(tv.tv_sec as u64 * 1000 + (tv.tv_usec as u64) / 1000)
}
