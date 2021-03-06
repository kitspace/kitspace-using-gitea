const EventEmitter = require('events')
const express = require('express')
const log = require('loglevel')
const path = require('path')
const fileUpload = require('express-fileupload')

const processKicadPCB = require('./tasks/processKicadPCB')
const { writeFile, exec } = require('./utils')

const { DATA_DIR } = require('./env')
const remoteProcessOutputDir = path.join(DATA_DIR, 'remote-process-public')
const remoteProcessInputDir = path.join(DATA_DIR, 'remote-process-input-files')

function createRemoteAPI(app) {
  app.use(fileUpload())

  const events = new EventEmitter()

  const processFileStatus = {}

  events.on('in_progress', x => {
    x = path.relative(remoteProcessOutputDir, x)
    processFileStatus[x] = { status: 'in_progress' }
    log.debug('in_progress', x)
  })
  events.on('done', x => {
    x = path.relative(remoteProcessOutputDir, x)
    processFileStatus[x] = { status: 'done' }
    log.debug('done', x)
  })
  events.on('failed', (x, e) => {
    const error = e.message || e.stderr || 'Unknown error'
    processFileStatus[x] = { status: 'failed', error }
    log.debug('failed', x, error)
  })

  app.post('/process-file', async (req, res) => {
    try {
      if (req.headers.authorization !== `Bearer ${process.env.REMOTE_API_TOKEN}`) {
        return res.sendStatus(403)
      }
      if (req.files == null) {
        return res.status(422).send('No file uploaded')
      }

      const upload = req.files.upload
      if (upload == null) {
        return res
          .status(422)
          .send('Form input name for uploaded file needs to be "upload"')
      }
      if (upload.md5 == null) {
        throw Error('Could not hash file')
      }
      const uploadFolder = path.join(remoteProcessInputDir, upload.md5)
      const ext = path.extname(upload.name)
      if (ext !== '.kicad_pcb') {
        return res.status(422).send('Only accepting .kicad_pcb files')
      }
      const uploadPath = path.join(uploadFolder, upload.md5 + ext)
      const outputDir = path.join(remoteProcessOutputDir, upload.md5)
      await exec(`mkdir -p ${uploadFolder}`)
      await writeFile(uploadPath, upload.data).then(() => {
        processKicadPCB(events, uploadFolder, {}, outputDir)
      })
      res.status(202).send({
        id: upload.md5,
      })
    } catch (err) {
      log.error(err)
      res.status(500).send(err)
    }
  })

  app.get('/processed/status/*', (req, res, next) => {
    let x = path.relative('/processed/status/', req.path)
    if (x in processFileStatus) {
      return res.send(processFileStatus[x])
    }
    return res.sendStatus(404)
  })

  const processStaticFiles = express.static(remoteProcessOutputDir)

  app.get('/processed/files/*', (req, res, next) => {
    let x = path.relative('/processed/files/', req.url)

    if (x in processFileStatus) {
      if (processFileStatus[x].status === 'in_progress') {
        // send a 202, "Accepted" status when the asset processing is in progress
        return res.sendStatus(202)
      }
      if (processFileStatus[x].status === 'done') {
        req.url = x
        return processStaticFiles(req, res, next)
      }
      if (processFileStatus[x].status === 'failed') {
        // send a 424, "Failed Dependency" error when the asset processing failed
        res.status(424)
        return res.send(processFileStatus[x].error)
      }
    }
    return res.sendStatus(404)
  })

  return app
}

module.exports = { createRemoteAPI }
