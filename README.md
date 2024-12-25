## 测试
curl --location 'http://127.0.0.1:3000/recvd' \
--form 'type="text"' \
--form 'content="倒计时"' \
--form 'source="{\\\"room\\\":\\\"\\\",\\\"to\\\":{\\\"_events\\\":{},\\\"_eventsCount\\\":0,\\\"id\\\":\\\"@f387910fa45\\\",\\\"payload\\\":{\\\"alias\\\":\\\"\\\",\\\"avatar\\\":\\\"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=1302335654&username=@f38bfd1e0567910fa45&skey=@crypaafc30\\\",\\\"friend\\\":false,\\\"gender\\\":1,\\\"id\\\":\\\"@f38bfd1e10fa45\\\",\\\"name\\\":\\\"ch.\\\",\\\"phone\\\":[],\\\"star\\\":false,\\\"type\\\":1}},\\\"from\\\":{\\\"_events\\\":{},\\\"_eventsCount\\\":0,\\\"id\\\":\\\"@6b5111dcc269b6901fbb58\\\",\\\"payload\\\":{\\\"address\\\":\\\"\\\",\\\"alias\\\":\\\"\\\",\\\"avatar\\\":\\\"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=123234564&username=@6b5dbb58&skey=@crypt_ec356afc30\\\",\\\"city\\\":\\\"Mars\\\",\\\"friend\\\":false,\\\"gender\\\":1,\\\"id\\\":\\\"@6b5dbd3facb58\\\",\\\"name\\\":\\\"Daniel\\\",\\\"phone\\\":[],\\\"province\\\":\\\"Earth\\\",\\\"signature\\\":\\\"\\\",\\\"star\\\":false,\\\"weixin\\\":\\\"\\\",\\\"type\\\":1}}}"' \
--form 'isMentioned="1"'

## docker
docker build -t wechat-bot .
docker run -d --name wechat-bot --network host -v /www/wwwroot/wechat-bot-data:/wechat-bot-data wechat-bot

docker run -d --name wxBotWebhook \
--network host \
-v /www/wwwroot/wechat-bot-data:/wechat-bot-data \
-v ~/wxBot_logs:/app/log \
-e RECVD_MSG_API=http://localhost:3000/recvd \
-e LOCAL_LOGIN_API_TOKEN=YpIZOxT77sGR \
dannicool/docker-wechatbot-webhook
