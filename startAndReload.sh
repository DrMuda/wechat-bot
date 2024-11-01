docker stop wechat-bot
docker rm wechat-bot
docker rmi wechat-bot
docker build -t wechat-bot .
docker run -d --name wechat-bot --network my-network -e TZ='Asia/Shanghai' -p 3000:3000 -v /www/wwwroot/wechat-bot-data:/wechat-bot-data wechat-bot