import React, { useState, useEffect } from 'react'
import { Icon, List } from 'semantic-ui-react'

import styles from './FilesPreview.module.scss'

const Tree = ({ files, select, selected, externallyMarked }) => {
  if (files == null) {
    return <span>Loading...</span>
  }
  const nodes = files?.map(node => (
    <List.Item key={node.path}>
      <TreeNode
        node={node}
        select={select}
        selected={selected}
        externallyMarked={externallyMarked}
        marked={selected === node || node.path === externallyMarked}
      />
    </List.Item>
  ))

  return <List className={styles.tree}>{nodes}</List>
}

const TreeNode = ({ node, select, selected, marked, externallyMarked }) => {
  const [toggled, setToggled] = useState(false)
  const [checked, setChecked] = useState(false)
  const [nodeData, setNodeData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    select(node, checked)
  }, [checked])

  useEffect(() => {
    // Used to control the checkbox externally.
    if (marked != null) {
      setChecked(marked)
    }
  }, [marked])

  useEffect(() => {
    fetch(node.url)
      .then(r => r.json())
      .then(setNodeData)
      .catch(e => {
        setFailed(true)
        console.error(e)
      })
  }, [toggled])

  if (node.type === 'file') {
    return (
      <div className={styles.file} onClick={() => setChecked(!checked)}>
        <input
          className={styles.checkbox}
          type="checkbox"
          checked={checked}
          onChange={() => setChecked(!checked)}
        />
        <Icon name="file" />
        <div>
          <List.Content>
            <List.Header data-cy="file-name">{node.name}</List.Header>
          </List.Content>
        </div>
      </div>
    )
  } else if (node.type === 'dir') {
    return (
      <div className={styles.dir} >
        <input
          className={styles.checkbox}
          type="checkbox"
          checked={checked}
          onChange={() => setChecked(!checked)}
        />
      <details
        style={{ paddingLeft: '0.3rem' }}
        onToggle={() => setToggled(!toggled)}
      >
        <summary>
          <Icon name="folder"></Icon>
          {node.name}
        </summary>
        <div style={{ paddingLeft: '1.3rem' }}>
          <Tree
            files={nodeData}
            select={select}
            selected={selected}
            externallyMarked={externallyMarked}
          />
          {failed ? 'Failed to load files!' : null}
        </div>
      </details>
      </div>
    )
  } else {
    return <span>Loading...</span>
  }
}

const FilesPreview = props => {
  return (
    <div>
      <p>Select from previously uploaded files:</p>
      <Tree {...props} />
    </div>
  )
}
export default FilesPreview
