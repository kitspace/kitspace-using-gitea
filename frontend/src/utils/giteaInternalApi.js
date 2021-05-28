/*
 * Committing multiple files to gitea is a two steps process:
 *  1. Upload the files to gitea which it turn returns a UUID for that file
 *  2. UUID returned from the previous step is used to make the actual commit request.
 */

import { b64toBlob, readFileContent } from '@utils/index'
import { dirname } from 'path'

/**
 * Upload a file to gitea server. Just upload, it doesn't commit the files.
 * @param repo{string}
 * @param file{object}
 * @param filePath{string}
 * @param csrf{string}
 * @returns {Promise<Object>}
 */
const uploadFileToGiteaServer = async (repo, file, filePath, csrf) => {
  const fileContentBlob = await b64toBlob(await readFileContent(file))
  const blobFromFile = new Blob([fileContentBlob], { type: file.type })

  const formData = new FormData()
  formData.append('file', blobFromFile, filePath)

  return new Promise((resolve, reject) => {
    const endpoint = `${process.env.KITSPACE_GITEA_URL}/${repo}/upload-file?_csrf=${csrf}`
    const req = new XMLHttpRequest()
    req.withCredentials = true
    req.open('POST', endpoint)

    req.onload = () => {
      if (req.status >= 200 && req.status < 300) {
        resolve(JSON.parse(req.response))
      } else {
        reject({
          status: req.status,
          statusText: req.statusText,
        })
      }
    }

    req.onerror = () => {
      reject({
        status: req.status,
        statusText: req.statusText,
      })
    }

    req.send(formData)
  })
}

/**
 * Upload multiple files to gitea server. Just upload, it doesn't commit the files.
 * @param repo{string}
 * @param files{[]}
 * @param filePaths{[]string}
 * @param csrf{string}
 * @returns {Promise<string[]>}
 */
export const uploadFilesToGiteaServer = async (repo, files, filePaths, csrf) => {
  const filesUUIDs = await Promise.all(
    files.map((file, i) => {
      return uploadFileToGiteaServer(repo, file, filePaths[i], csrf)
    }),
  )
  // noinspection JSUnresolvedVariable
  return filesUUIDs.map(res => res.uuid)
}

/**
 * Takes an array of files and commit it to Gitea server. If the files are all
 * in a folder it will be stripped from the path.
 * @param repo{string}
 * @param files{[]}
 * @param commitSummary{=string}
 * @param commitMessage{=string}
 * @param commitChoice{=string}
 * @param treePath{=string}
 * @param newBranchName{=string}
 * @param csrf{string}
 * @returns {Promise<boolean>}
 */
export const commitInitialFiles = async ({
  repo,
  files,
  commitSummary,
  commitMessage,
  commitChoice,
  newBranchName,
  csrf,
}) => {
  // remove any leading "/"
  let filePaths = files.map(file =>
    file.path.startsWith('/') ? file.path.substring(1) : file.path,
  )
  // unless there are some top level files, we remove the top-level directory
  // from the filePaths. we assume the whole directory was the upload and we
  // don't want them in that directory in the git repo.
  const hasTopLevelFile = filePaths.map(dirname).includes('.')
  if (!hasTopLevelFile) {
    filePaths = filePaths.map(filePath => filePath.split('/').slice(1).join('/'))
  }
  const filesUUIDs = await uploadFilesToGiteaServer(repo, files, filePaths, csrf)

  await commitFilesWithUUIDs({
    repo,
    filesUUIDs,
    commitSummary,
    commitMessage,
    commitChoice,
    newBranchName,
    csrf,
  })
}

/**
 * Take an array of UUIDs of files that have been uploaded to Gitea and commit it to Gitea server.
 * @param repo{string}
 * @param filesUUIDs{[string]}
 * @param commitSummary{=string}
 * @param commitMessage{=string}
 * @param commitChoice{=string}
 * @param treePath{=string}
 * @param newBranchName{=string}
 * @param csrf{string}
 * @returns {Promise<boolean>}
 */
export const commitFilesWithUUIDs = async ({
  repo,
  filesUUIDs,
  commitSummary = 'Upload files',
  commitMessage = '',
  commitChoice = 'direct',
  treePath = '',
  newBranchName = 'patch-1',
  csrf,
}) => {
  const endpoint = `${process.env.KITSPACE_GITEA_URL}/${repo}/upload/master?_csrf=${csrf}`

  // The body of the request must be url encoded
  const body = new URLSearchParams({
    _csrf: csrf,
    tree_path: treePath,
    commit_summary: commitSummary,
    commit_message: commitMessage,
    commit_choice: commitChoice,
    new_branch_name: newBranchName,
  })

  // Files UUIDs aren't passed as an array; each file is passed as `&files={uuid}` in the request body
  filesUUIDs.forEach(uuid => {
    body.append('files', uuid)
  })

  const res = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    mode: 'cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  })

  return res.ok
}
