OLD_IMAGE_ID=$(docker images -q wechat-bot)
LABEL="cache=wechat-bot"

docker build --label $LABEL -t wechat-bot .
docker stop wechat-bot
docker rm wechat-bot
if [ -n "$OLD_IMAGE_ID" ] && [ "$OLD_IMAGE_ID" != "$(docker images -q wechat-bot:latest)" ]; then
  docker rmi "$OLD_IMAGE_ID"
fi
docker run -d --name wechat-bot --network host -e TZ='Asia/Shanghai' -v /www/wwwroot/wechat-bot-data:/wechat-bot-data wechat-bot
docker builder prune --filter "label=$LABEL" -f
