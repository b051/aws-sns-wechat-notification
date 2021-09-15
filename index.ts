import * as Koa from 'koa'
import * as request from 'superagent'
import * as parse from 'co-body'

const app = new Koa()

const WX = 'https://qyapi.weixin.qq.com/cgi-bin'
const access_tokens = new Map<string, { token: string, expires_at: number }>()

const wxsend = async (agentid: string, subject: string, message: string) => {
  const _token = access_tokens.get(agentid)
  if (!_token || Date.now() > _token.expires_at) {
    const res = await request.get(`${WX}/gettoken`).query({ corpid: process.env.CORP_ID, corpsecret: process.env[`CORP_${agentid}`] })
    access_tokens.set(agentid, {
      token: res.body.access_token,
      expires_at: Date.now() + (res.body.expires_in - 120) * 1000
    })
  }
  
  let content: string
  if (typeof(message) === 'string') {
    try {
      message = JSON.parse(message)
    } catch (error) {
    }
  }
  console.log({ message, subject })
  if (typeof(message) === 'object') {
    const { applicationName, deploymentId, deploymentGroupName, instanceStatus, status } = message
    if (status) {
      content = `${applicationName}/${deploymentGroupName} Deploy ${status} (deploymentId=${deploymentId})`
    } else if (instanceStatus) {
      content = `${applicationName}/${deploymentGroupName} Deploy ${status} (deploymentId=${deploymentId})`
    } else {
      content = `${subject}\n${JSON.stringify(message, null, 2)}`
    }
  } else {
    content = `${subject}: ${message}`
  }

  // https://work.weixin.qq.com/api/doc#90000/90135/90236
  const res = await request.post(`${WX}/message/send`).query({ access_token: _token.token }).send({
    touser: "@all",
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