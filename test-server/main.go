package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/1f349/mjwt"
	"github.com/1f349/mjwt/auth"
	"github.com/1f349/mjwt/claims"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

var wsUpgrade = &websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	log.Println("Starting test server")
	signer, err := mjwt.NewMJwtSignerFromFileOrCreate("Test SSO Service", "private.key.local", rand.Reader, 2048)
	if err != nil {
		log.Fatal(err)
	}

	go ssoServer(signer)
	go apiServer(signer)
	done := make(chan struct{})
	<-done
}

func ssoServer(signer mjwt.Signer) {
	r := http.NewServeMux()
	r.HandleFunc("/popup", func(w http.ResponseWriter, r *http.Request) {
		ps := claims.NewPermStorage()
		ps.Set("mail:inbox=admin@localhost")
		accessToken, err := signer.GenerateJwt("81b99bd7-bf74-4cc2-9133-80ed2393dfe6", uuid.NewString(), jwt.ClaimStrings{"d0555671-df9d-42d0-a4d6-94b694251f0b"}, 15*time.Minute, auth.AccessTokenClaims{
			Perms: ps,
		})
		if err != nil {
			http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Test SSO Service</title>
  <script>
    let loginData = {
      target: "http://localhost:5173",
      userinfo: {
        "aud": "d0555671-df9d-42d0-a4d6-94b694251f0b",
        "email": "admin@localhost",
        "email_verified": true,
        "name": "Admin",
        "preferred_username": "admin",
        "sub": "81b99bd7-bf74-4cc2-9133-80ed2393dfe6",
        "picture": "http://localhost:5173/1f349.svg",
        "updated_at": 0
      },
      tokens: {
        access: "%s",
        refresh: "%s",
      },
    };
    window.addEventListener("load", function () {
      setTimeout(function() {
        window.opener.postMessage(loginData, loginData.target);
      },2000);
    });
  </script>
</head>
<body>
<header>
  <h1>Test SSO Service</h1>
</header>
<main id="mainBody">Loading...</main>
</body>
</html>
`, accessToken, "")
	})
	log.Println("[SSO Server]", http.ListenAndServe(":9090", r))
}

var serveApiCors = cors.New(cors.Options{
	AllowedOrigins: []string{"*"}, // allow all origins for api requests
	AllowedHeaders: []string{"Content-Type", "Authorization"},
	AllowedMethods: []string{
		http.MethodGet,
		http.MethodHead,
		http.MethodPost,
		http.MethodPut,
		http.MethodPatch,
		http.MethodDelete,
		http.MethodConnect,
	},
	AllowCredentials: true,
})

func apiServer(verify mjwt.Verifier) {
	r := http.NewServeMux()
	r.Handle("/v1/lotus", hasPerm(verify, "mail-client", func(rw http.ResponseWriter, req *http.Request) {
		m := make([]map[string]any, 0, 40)
		for i := 0; i < 20; i++ {
			m = append(m, map[string]any{
				"src":    uuid.NewString() + ".example.com",
				"dst":    "127.0.0.1:8080",
				"desc":   "This is a test description",
				"flags":  181,
				"active": true,
			})
		}
		for i := 0; i < 20; i++ {
			m = append(m, map[string]any{
				"src":    uuid.NewString() + ".example.org",
				"dst":    "127.0.0.1:8085",
				"desc":   "This is a test description",
				"flags":  17,
				"active": true,
			})
		}
		json.NewEncoder(rw).Encode(m)
	}))
	r.HandleFunc("/v1/lotus/imap", func(rw http.ResponseWriter, req *http.Request) {
		c, err := wsUpgrade.Upgrade(rw, req, nil)
		if err != nil {
			log.Println("WebSocket upgrade error:", err)
			return
		}
		defer c.Close()

		for {
			var m map[string]any
			err = c.ReadJSON(&m)
			if err != nil {
				log.Println("WebSocket json error:", err)
				return
			}
			if v, ok := m["token"]; ok {
				_, b, err := mjwt.ExtractClaims[auth.AccessTokenClaims](verify, v.(string))
				if err != nil {
					c.WriteMessage(websocket.TextMessage, []byte("Invalid token"))
					return
				}
				b2 := b.Claims.Perms.Search("mail:inbox=*")
				if len(b2) != 1 {
					c.WriteMessage(websocket.TextMessage, []byte("Invalid mail inbox perm"))
					return
				}
				c.WriteMessage(websocket.TextMessage, []byte(`{"auth":"ok"}`))
				continue
			} else if vAct, ok := m["action"]; ok {
				switch vAct.(string) {
				case "list":
					log.Println(m)
					if slices.EqualFunc[[]any, []any, any, any](m["args"].([]any), []any{"", "*"}, func(a1, a2 any) bool {
						return a1 == a2
					}) {
						c.WriteMessage(websocket.TextMessage, []byte(`
{
	"type": "list",
	"value": [
	  {"Attributes": ["\\HasChildren", "\\UnMarked", "\\Archive"], "Delimiter": "/", "Name": "Archive"},
	  {"Attributes": ["\\HasNoChildren", "\\UnMarked"], "Delimiter": "/", "Name": "Archive/2022"},
	  {"Attributes": ["\\HasNoChildren", "\\UnMarked"], "Delimiter": "/", "Name": "Archive/2023"},
	  {"Attributes": ["\\HasNoChildren", "\\UnMarked", "\\Junk"], "Delimiter": "/", "Name": "Junk"},
		{"Attributes": ["\\HasChildren", "\\Trash"], "Delimiter": "/", "Name": "Trash"},
		{"Attributes": ["\\HasNoChildren", "\\UnMarked"], "Delimiter": "/", "Name": "INBOX/status"},
		{"Attributes": ["\\HasNoChildren", "\\UnMarked"], "Delimiter": "/", "Name": "INBOX/hello"},
		{"Attributes": ["\\HasNoChildren", "\\UnMarked"], "Delimiter": "/", "Name": "INBOX/hi"},
		{"Attributes": ["\\Noselect", "\\HasChildren"], "Delimiter": "/", "Name": "INBOX/test/sub/folder"},
		{"Attributes": ["\\HasNoChildren"], "Delimiter": "/", "Name": "INBOX/test/sub/folder/something"},
		{"Attributes": ["\\HasNoChildren", "\\UnMarked", "\\Drafts"], "Delimiter": "/", "Name": "Drafts"},
		{"Attributes": ["\\HasNoChildren", "\\Sent"], "Delimiter": "/", "Name": "Sent"},
		{"Attributes": ["\\HasChildren"], "Delimiter": "/", "Name": "INBOX"}
	]
}
`))
					}
					continue
				}
			}
		}
	})

	logger := http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		log.Println("[API Server]", req.URL.String())
		r.ServeHTTP(rw, req)
	})
	log.Println("[API Server]", http.ListenAndServe(":9095", serveApiCors.Handler(logger)))
}

func hasPerm(verify mjwt.Verifier, perm string, next func(rw http.ResponseWriter, req *http.Request)) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		a := req.Header.Get("Authorization")
		if !strings.HasPrefix(a, "Bearer ") {
			http.Error(rw, "Missing bearer authorization", http.StatusForbidden)
			return
		}
		_, b, err := mjwt.ExtractClaims[auth.AccessTokenClaims](verify, a[len("Bearer "):])
		if err != nil {
			http.Error(rw, "Invalid token", http.StatusForbidden)
			log.Println("Invalid token:", err)
			return
		}
		if !b.Claims.Perms.Has(perm) {
			http.Error(rw, "Missing permission", http.StatusForbidden)
			return
		}
		next(rw, req)
	})
}
