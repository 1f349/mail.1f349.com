import {loginStore} from "../stores/login";

let currentLoginPopup: {close: () => void} | null = null;

const ssoOrigin = import.meta.env.VITE_SSO_ORIGIN;

window.addEventListener("message", function (event) {
  if (event.origin !== ssoOrigin) return;
  if (isObject(event.data)) {
    loginStore.set(event.data);
    if (currentLoginPopup) currentLoginPopup.close();
    return;
  }
  alert("Failed to log user in: the login data was probably corrupted");
});

function isObject(obj: Object) {
  return obj != null && obj.constructor.name === "Object";
}

function popupCenterScreen(url: string, title: string, w: number, h: number, focus: boolean) {
  const top = (screen.availHeight - h) / 4,
    left = (screen.availWidth - w) / 2;
  const popup = openWindow(url, title, `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`);
  if (focus === true && window.focus !== undefined && popup !== null) popup.focus();
  return popup;
}

function openWindow(url: string | URL, winnm: string, options: string): Window | null {
  var wTop = firstAvailableValue([window.screen.availTop, window.screenY, window.screenTop, 0]);
  var wLeft = firstAvailableValue([window.screen.availLeft, window.screenX, window.screenLeft, 0]);
  let w: Window | null;
  var top = 0,
    left = 0;
  var result;
  if ((result = /top=(\d+)/g.exec(options))) top = parseInt(result[1]);
  if ((result = /left=(\d+)/g.exec(options))) left = parseInt(result[1]);
  if (options) {
    options = options.replace("top=" + top, "top=" + (top + wTop));
    options = options.replace("left=" + left, "left=" + (left + wLeft));
    w = window.open(url, winnm, options);
  } else w = window.open(url, winnm);
  return w;
}

function firstAvailableValue(arr: any) {
  for (var i = 0; i < arr.length; i++) if (typeof arr[i] != "undefined") return arr[i];
}

export function openLoginPopup() {
  if (currentLoginPopup) currentLoginPopup.close();
  currentLoginPopup = popupCenterScreen(ssoOrigin + "/popup?origin=" + encodeURIComponent(location.origin), "Login with 1f349 SSO", 500, 500, false);
}
