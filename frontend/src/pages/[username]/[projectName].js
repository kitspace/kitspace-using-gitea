import React, { useEffect, useState, useContext } from 'react'
import { useRouter } from 'next/router'
import _ from 'lodash'
import dynamic from 'next/dynamic'

import { Page } from '@components/Page'
import FilesPreview from '@components/FilesPreview'
import useForm from '@hooks/useForm'
import { ProjectUpdateFormModel } from '@models/ProjectUpdateForm'
import {
  getDefaultBranchFiles,
  getRepo,
  repoExists,
  updateRepo,
} from '@utils/giteaApi'
import { pollMigrationStatus, useDefaultBranchFiles, useRepo } from '@hooks/Gitea'
import {
  Button,
  Form,
  Header,
  Input,
  Loader,
  Message,
  Segment,
  TextArea,
} from 'semantic-ui-react'
import {
  commitFilesWithUUIDs,
  uploadFilesToGiteaServer,
} from '@utils/giteaInternalApi'
import { AuthContext } from '@contexts/AuthContext'
import ErrorPage from '@pages/_error'
import BoardShowcase from '@components/Board/BoardShowcase'

const DropZone = dynamic(() => import('@components/DropZone'))

export const getServerSideProps = async ({ params, query }) => {
  const repoFullName = `${params.username}/${params.projectName}`
  if (await repoExists(repoFullName)) {
    const repo = await getRepo(repoFullName)
    const repoFiles = await getDefaultBranchFiles(repoFullName)

    return {
      props: {
        repo,
        repoFiles,
        isSynced: repo?.mirror,
        isEmpty: repo?.empty,
        user: params.user,
        projectName: params.projectName,
        isNew: query.create === 'true',
      },
    }
  } else {
    return { notFound: true }
  }
}

const UpdateProject = ({
  repo,
  repoFiles,
  isSynced,
  isEmpty,
  user,
  projectName,
  isNew,
}) => {
  const fullName = `${user}/${projectName}`
  const { reload } = useRouter()

    const { status } = pollMigrationStatus(repo.id, {
        refreshInterval: isEmpty ? 1000 : null,
    })
    const [isSyncing, setIsSyncing] = useState(isEmpty)

  const { status } = pollMigrationStatus(repo.id, {
    refreshInterval: isEmpty ? 1000 : null,
  })
  const [isSyncing, setIsSyncing] = useState(isEmpty)

  useEffect(() => {
    setIsSyncing(status === 'Queue' || status === 'Running')

    if (!isSynced && status === 'Finished') { reload() }
  }, [status])

    if (isLoading) {
        return (
            <Page>
                <Loader active />
            </Page>
        )
    } else if (isSyncing) {
        return (
            <Page>
                <Loader active>Syncing repository...</Loader>
            </Page>
        )
    } else if (status === 'Failed') {
        return (
            <Page>
                <Loader active>Migration Failed, please try again later!</Loader>
            </Page>
        )
    } else if (isError) {
        return <ErrorPage statusCode={404} />
    }

  if (isLoading) {
    return (
      <Page>
        <Loader active />
      </Page>
    )
  } else if (isSyncing) {
    return (
      <Page>
        <Loader active>Syncing repository...</Loader>
      </Page>
    )
  } else if (status === 'Failed') {
    return (
      <Page>
        <Loader active>Migration Failed, please try again later!</Loader>
      </Page>)
  } else if (isError) {
    return <ErrorPage statusCode={404} />
  }

  return (
    <Page>
      <div style={{ maxWidth: '70%', margin: 'auto' }}>
        {isSynced ? (
          <Message data-cy="sync-msg" color="yellow">
            <Message.Header>A synced repository!</Message.Header>
            <Message.Content>
              <p>Files uploading isn't supported for synced repositories.</p>
              Please commit files to the original git repository and it will be
              synced automatically.
            </Message.Content>
          </Message>
        ) : null}
        <Header as="h2" textAlign="center">
          Updating {projectName} by {user}
        </Header>
        <UpdateForm
          repoFiles={repoFiles}
          isNew={isNew}
          previewOnly={isSynced}
          owner={user}
          name={projectName}
          description={project?.description}
        />
      </div>
    </Page>
  )
}

const UpdateForm = ({
  repoFiles,
  isNew,
  previewOnly,
  owner,
  name,
  description,
}) => {
  const projectFullname = `${owner}/${name}`
  // The files in the Gitea repo associated with this project and the newly loaded files
  const {
    files: remoteFiles,
    isLoading,
    mutate,
  } = useDefaultBranchFiles(projectFullname, { initialData: repoFiles })
  // UUIDs for files dropped in the update page, the files gets committed on submit
  const [newlyUploadedUUIDs, setNewlyUploadedUUIDs] = useState([])
  // Details(name, path, last_modified, etc...) for files dropped in the update page
  const [newlyUploadedDetails, setNewlyUploadedDetails] = useState([])
  const [allFiles, setAllFiles] = useState([])
  const [isValidProjectName, setIsValidProjectName] = useState(false)
  const [loading, setLoading] = useState(false)
  const { push } = useRouter()
  const { csrf } = useContext(AuthContext)
  const { form, onChange, populate, isValid, formatErrorPrompt } = useForm(
    ProjectUpdateFormModel,
  )

  // Set values of the form as the values of the project stored in the Gitea repo
  useEffect(() => {
    populate({ name, description }, true)
  }, [])

  // A disjoint between the newly uploaded files(waiting for submission) and the files
  // on the Gitea repo for this project
  useEffect(() => {
    setAllFiles(_.uniqBy([...remoteFiles, ...newlyUploadedDetails], 'name'))
  }, [remoteFiles, newlyUploadedUUIDs])

  useEffect(() => {
    if (form.name) {
      // noinspection JSIgnoredPromiseFromCall
      validateProjectName()
    }
  }, [form.name])

  const submit = async e => {
    /**
     * The update must be done in this order.
     *  i. Commit the files
     *  ii. update project details
     * If this order were reversed uploading new files and changing the project name wouldn't work;
     * The files would be committed to the old repo it won't be under the project with new name
     */
    e.preventDefault()
    setLoading(true)

    await commitFilesWithUUIDs({
      repo: projectFullname,
      filesUUIDs: newlyUploadedUUIDs,
      csrf,
    })
    await mutate()

    const updatedSuccessfully = await updateRepo(
      projectFullname,
      { name: form.name, description: form.description },
      csrf,
    )

    // If the user changed the project name redirect to the new project page
    if (updatedSuccessfully) {
      if (name !== `${owner}/${form.name}`) {
        await push(`/${owner}/${form.name}`)
      }
      setLoading(false)
    }
  }

  const onDrop = async files => {
    // Commit files directly to gitea server on drop
    const UUIDs = await uploadFilesToGiteaServer(projectFullname, files, csrf)

    setNewlyUploadedDetails(files)
    setNewlyUploadedUUIDs([...newlyUploadedUUIDs, UUIDs])
  }

  const validateProjectName = async () => {
    // Check if the new name will cause a conflict.
    const repoFullname = `${owner}/${form.name}`

    // If the project name hasn't changed it's valid
    if (repoFullname === `${owner}/${name}`) {
      setIsValidProjectName(isValid)
    } else {
      // Otherwise check if there's no repo with same name
      if (!(await repoExists(repoFullname))) {
        setIsValidProjectName(isValid)
      } else {
        setIsValidProjectName(false)
      }
    }
  }

  const formatProjectNameError = () => {
    // disjoint form validation errors, e.g, maximum length, not empty, etc, with conflicting project name errors
    const formErrors = formatErrorPrompt('name')

    if (formErrors) {
      return formErrors
    } else {
      return !isValidProjectName
        ? {
          content: `A project named "${form.name}" already exists!`,
          pointing: 'below',
        }
        : null
    }
  }

  if (isLoading) return <Loader active />

    return (
        <>
            <BoardShowcase projectFullname={projectFullname} />
            <Form>
                <Segment>
                    {!previewOnly ? <DropZone onDrop={onDrop} /> : null}
                    <FilesPreview files={allFiles} />
                </Segment>
                <Segment>
                    <Form.Field
                        data-cy="update-form-name"
                        fluid
                        required
                        readOnly={previewOnly}
                        control={Input}
                        label="Project name"
                        placeholder="Project name"
                        name="name"
                        value={form.name || ''}
                        onChange={onChange}
                        error={formatProjectNameError('name')}
                    />
                    <Form.Field
                        data-cy="update-form-description"
                        readOnly={previewOnly}
                        control={TextArea}
                        label="Project description"
                        placeholder="Project description"
                        name="description"
                        value={form.description || ''}
                        onChange={onChange}
                        error={formatErrorPrompt('description')}
                    />
                    <Form.Field
                        data-cy="update-form-submit"
                        fluid
                        control={Button}
                        content={isNew ? 'Create' : 'Update'}
                        disabled={previewOnly || !isValidProjectName || loading}
                        onClick={submit}
                        positive
                        loading={loading}
                    />
                </Segment>
            </Form>
        </>
    )
}

export default UpdateProject
