/**
 * haptics
 * 対応端末（主にAndroid Chrome / PWA）でVibration APIによる触覚フィードバックを行う。
 * 非対応端末（iOS Safari等）では何も起きない安全な作りにする。
 */

export function hapticTap() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12);
  }
}

export function hapticSuccess() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([15, 60, 25]);
  }
}
