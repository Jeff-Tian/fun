#!/bin/sh

PORT="60006"
APP_NAME="fun"
#NODE_ENV="prd"

################################
#     START PM2 INSTANCE	   #
################################
if [ -n "$PORT" ]; then
	echo "Listening on port: $PORT"
	export PORT
	#export NODE_ENV
fi

#export NODE_ENV

CURRENT_PATH=`dirname $0`
pm2 start "$CURRENT_PATH/www" --name "$APP_NAME"
exit $?
