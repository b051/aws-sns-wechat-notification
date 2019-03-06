import * as Koa from 'koa'
import * as request from 'superagent'
import * as parse from 'co-body'

const app = new Koa()
const Receipients = {
//   '1000002': ['b051', 'YuJing', 'stevexu']
}

const WX = 'https://qyapi.weixin.qq.com/cgi-bin'
let access_token
const wxsend = async (agentid: string, subject: string, message: string) => {
  if (!access_token) {
    const res = await request.get(`${WX}/gettoken`).query({ corpid: process.env.CORP_ID, corpsecret: process.env.CORP_SECRET })
    access_token = res.body.access_token
    setTimeout(() => access_token = null, res.body.expires_in * 1000)
  }
  
  let content = `${subject}: ${message}`
  if (message.endsWith('}')) {
    const idx = message.indexOf('{')
    if (idx > 0) {
      try {
        const json = JSON.parse(message.substr(idx))
        const { applicationName, deploymentId, deploymentGroupName, status } = json
        if (status) {
          content = `${applicationName}/${deploymentGroupName} ${status} (deploymentId=${deploymentId})`
        }
      } catch (error) {
      }
    }
  }

  const receipients = Receipients[agentid]
  let touser: string
  if (Array.isArray(receipients)) {
    touser = receipients.join('|')
  } else {
    touser = "@all"
  }
  // https://work.weixin.qq.com/api/doc#90000/90135/90236
  const res = await request.post(`${WX}/message/send`).query({ access_token }).send({
    touser,
    msgtype: 'text',
    agentid,
    text: { content },
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