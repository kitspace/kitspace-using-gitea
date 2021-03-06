import React, { useContext } from 'react'
import { func, string } from 'prop-types'

import { Button, Modal } from 'semantic-ui-react'
import { deleteRepo } from '@utils/giteaApi'
import { AuthContext } from '@contexts/AuthContext'

const DeleteModal = ({ projectName, invalidateCache }) => {
  const { csrf } = useContext(AuthContext)

  return (
    <Modal
      trigger={<Button content="Delete" color="red" />}
      header="Heads up!"
      content={`Are you sure you want to delete the ${projectName} project?`}
      actions={[
        'Cancel',
        {
          key: 'delete',
          content: 'Delete',
          negative: true,
          onClick: async () => {
            await deleteRepo(projectName, csrf)
            // invalidate swr cache for `projects/mine` page.
            await invalidateCache()
          },
        },
      ]}
    />
  )
}

DeleteModal.propTypes = {
  projectName: string.isRequired,
  invalidateCache: func.isRequired,
}

export default DeleteModal
