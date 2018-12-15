import * as Koa from 'koa'
import * as request from 'superagent'
import * as parse from 'co-body'

const app = new Koa()

const port = process.env.PORT || 3030
app.use(async ctx => {
  const messageType = ctx.header['x-amz-sns-message-type']
  if (messageType === 'SubscriptionConfirmation') {
    const body = parse.json(ctx)
    console.log('SubscriptionConfirmation body', JSON.stringify(body))
    const res = await request.get(body['SubscribeURL'])
    console.log(res.status, res.body)
  } else if (messageType === 'Notification') {
    const body = parse.json(ctx)
    console.log('Subject:', body['Subject'])
    console.log('Message:', body['Message'])
  }
})
app.listen(port, () => {
  console.log(`app.listen(${port})`)
})