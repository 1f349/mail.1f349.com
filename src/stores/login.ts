import {get, writable} from "svelte/store";

export interface LoginStore {
  userinfo: {
    email: string;
    name: string;
    sub: string;
    picture: string;
  };
  tokens: {
    access: string;
    refresh: string;
  };
}

export const loginStore = writable<LoginStore | null>(
  (() => {
    try {
      return JSON.parse(localStorage.getItem("login-session") || "");
    } catch (_) {
      return null;
    }
  })(),
);

loginStore.subscribe(x => {
  localStorage.setItem("login-session", JSON.stringify(x));
});

export function getBearer() {
  return "Bearer " + (get(loginStore) as LoginStore).tokens.access;
}

export function parseJwt(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(""),
  );
  return JSON.parse(jsonPayload);
}
