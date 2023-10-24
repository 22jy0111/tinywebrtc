# tinywebrtc
WebRTCを使って簡単にビデオチャットをすることができるソフトウェアです。

## setting

### 必要なもの
* nginx
* node.js
	* typescript
	* express
	* socket.io

### nginxの設定

```shell
sudo mkdir /etc/nginx/ssl
sudo openssl genrsa -out /etc/nginx/ssl/server.key 2048
sudo openssl req -new -key /etc/nginx/ssl/server.key -out /etc/nginx/ssl/server.csr
sudo openssl x509 -days 3650 -req -signkey /etc/nginx/ssl/server.key -in /etc/nginx/ssl/server.csr -out /etc/nginx/ssl/server.crt
```

/etc/nginx/conf.d/default.conf
```
map $http_upgrade $connection_upgrade {
	default upgrade;
	''	close;
}

server {
	listen 443 ssl;

	ssl_certificate	/etc/nginx/ssl/server.crt;
	ssl_certificate_key /etc/nginx/ssl/server.key;

	proxy_http_version 1.1;
	proxy_set_header Host $host;
	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection $connection_upgrade;

	location / {
		proxy_pass http://localhost:3001;
	}
}
```

## 起動
```
npm i
npx nodemon src/index.ts
```
