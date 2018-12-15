import * as Koa from 'koa'
import * as request from 'superagent'
import * as parse from 'co-body'

const app = new Koa()
const Receipients = {
  '1000002': ['b051', 'YuJing']
}

const WX = 'https://qyapi.weixin.qq.com/cgi-bin'
let access_token
const wxsend = async (agentid: string, subject: string, message: string) => {
  if (!access_token) {
    const res = await request.get(`${WX}/gettoken`).query({ corpid: process.env.CORP_ID, corpsecret: process.env.CORP_SECRET })
    access_token = res.body.access_token
    setTimeout(() => access_token = null, res.body.expires_in * 1000)
  }
  
  const res = await request.post(`${WX}/message/send`).query({ access_token }).send({
    touser: Receipients[agentid].join('|'),
    msgtype: 'text',
    agentid,
    text: {
      content: `${subject}: ${message}`
    },
    safe: 0
  })
  return res
}

app.use(async ctx => {
  const messageType = ctx.header['x-amz-sns-message-type']
  if (messageType === 'SubscriptionConfirmation') {
    const { SubscribeURL } = await parse.json(ctx)
    await request.get(SubscribeURL)
    ctx.body = { SubscribeURL }
  } else if (messageType === 'Notification') {
    const { Subject, Message } = await parse.json(ctx)
    const { agentid } = ctx.request.query
    const res = await wxsend(agentid, Subject, Message)
    ctx.body = res.body
  } else {
    ctx.status = 404
  }
})

const port = process.env.PORT || 3030
app.listen(port, () => {
  console.log(`app.listen(${port})`)
})