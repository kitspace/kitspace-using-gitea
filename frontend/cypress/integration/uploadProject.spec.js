import faker from 'faker'

const updateProjectUrl = 'http://kitspace.test:3000'

describe('Upload project', () => {
  const username = faker.name.firstName()
  const email = faker.internet.email()
  const password = '123456'

  before(() => {
    cy.clearCookies()
    cy.createUser(username, email, password)
  })

  beforeEach(() => {
    // deauthenticate the user and reload the page to update the CSRF token
    cy.clearCookies()
    cy.reload()

    cy.visit('/login')
    cy.intercept('http://gitea.kitspace.test:3000/user/kitspace/**')
    cy.signIn(username, password)
    cy.wait(1000)

    cy.visit('/projects/new')
    cy.wait(1000)
    cy.preFileDrop(username)
  })

  it('should create a project and redirect to its update route on file drop', () => {
    // Simulate dropping a single file('example.png') in the dropzone.
    cy.fixture('example.png', 'base64').then(file => {
      cy.get('.dropzone').dropFiles([file], ['example.png'])
    })

    // Wait until getting a response from the server then validate a redirection has happened
    cy.wait(['@createRepo', '@getRepo'])
    cy.wait(1000)
    cy.url().should('eq', `${updateProjectUrl}/${username}/example?create=true`)

    cy.get('[data-cy=file-name]').contains('example.png')
  })

  it('should show modal on project names collision', () => {
    // Simulate dropping a single file('example.png') in the dropzone.
    cy.fixture('example.png', 'base64').then(file => {
      cy.get('.dropzone').dropFiles([file], ['example.png'])
    })

    cy.wait(['@createRepo', '@getRepo'])

    // Collision modal should open
    cy.get('[data-cy=collision-modal]').should('be.visible')

    // `Choose different name` should be disabled as the user haven't changed the name yet
    cy.get('[data-cy=collision-different-name]').should('be.disabled')
    cy.get('[data-cy=collision-update]').should('be.enabled')
  })

  it('should commit files to the same project on `Update existing project`', () => {
    // Dropping a single file with the same name as an existing project(example)
    // will trigger a name collision

    // Simulate dropping a single file('example.png') in the dropzone.
    cy.fixture('example.png', 'base64').then(f1 => {
      cy.fixture('example2.png', 'base64').then(f2 => {
        cy.get('.dropzone').dropFiles([f1, f2], ['example.png', 'example2.png'])
      })
    })

    cy.wait(['@createRepo', '@getRepo'])

    // Choose `Update existing project`
    cy.get('[data-cy=collision-update]').click()

    // redirect to the upload page
    cy.url().should('eq', `${updateProjectUrl}/${username}/example`)

    // The new file is committed and on the update page
    cy.get('[data-cy=file-name]').contains('example2.png')
  })

  // TODO FIXME
  // it('should create a project and redirect to its update route on `Choose different name`', () => {
  //   // Dropping a single file with the same name as an existing project(example)
  //   // will trigger a name collision

  //   // Simulate dropping a single file('example.png') in the dropzone.
  //   cy.fixture('example.png', 'base64').then(f1 => {
  //     cy.fixture('example2.png', 'base64').then(f2 => {
  //       cy.get('.dropzone').dropFiles([f1, f2], ['example.png', 'example2.png'])
  //     })
  //   })

  //   cy.wait(['@createRepo', '@getRepo'])

  //   // Choose `Choose different name`
  //   const newName = faker.company.companyName()
  //   cy.get('input[name=name]').clear().type(newName)

  //   // On changing the project name the `Update existing project` button should be disabled
  //   cy.get('[data-cy=collision-update]').should('be.disabled')

  //   cy.get('[data-cy=collision-different-name]').click()

  //   cy.wait('@getRepo')

  //   // Clicking the `Choose different name` should create a new repo and redirects to its update page
  //   cy.url().should('eq', `${updateProjectUrl}/${username}/${newName}`)

  //   // Both files dropped should be in the update page
  //   cy.get('[data-cy=file-name]').contains('example.png')
  //   cy.get('[data-cy=file-name]').contains('example2.png')
  // })

  // it('should reject files bigger than `MAX_FILE_SIZE`', () => {
  //   cy.intercept(
  //     `http://gitea.kitspace.test:3000/${username}/big/upload-file**`,
  //   ).as('upload-big')

  //   //   Simulate dropping a single file('example.png') in the dropzone.
  //   cy.fixture('auto-gen/big.txt', 'base64').then(file => {
  //     cy.get('.dropzone').dropFiles([file], ['big.txt'])
  //   })

  //   // Wait additional 10s when when intercepting the response
  //   cy.wait(10000)
  //   cy.wait('@upload-big').its('response.statusCode').should('eq', 413)
  // })
})
