import { SignUpForm } from '../../models/SignUpForm'

describe('Sign up form validation', () => {
  before(() => {
    cy.visit('/login?sign_up')
  })

  afterEach(() => {
    cy.get('button').contains('Sign up').should('be.disabled')
  })

  it('routes to sign up form based on params', () => {
    cy.contains('Create a new account')
  })

  it('has the proper fields', () => {
    const formFields = SignUpForm.schema().$_terms.keys.map(field => field.key)

    formFields.forEach(field => cy.get(`input[name=${field}]`))
  })

  it('validates username field', () => {
    const invalidUsernames = ['abc ', 'abc@', ' ', '^', 'ZqFe3jOudI7DuBOJ1wyXT']

    invalidUsernames.forEach(username => {
      cy.get('input[name=username]').clear().type(username)
      cy.get('.negative').as('message')

      cy.get('@message').should('be.visible')
      cy.get('@message').get('div.header').should('not.be.visible')
      cy.get('@message').should('include.text', '"username"')
    })
  })

  it('validates email field', () => {
    const invalidEmails = ['abc ', 'abc@', ' ', '^', 'www.google.com']

    cy.get('input[name=username]').clear().type('someone')

    invalidEmails.forEach(email => {
      cy.get('input[name=email]').clear().type(email)
      cy.get('.negative').as('message')

      cy.get('@message').should('be.visible')
      cy.get('@message').get('div.header').should('not.be.visible')
      cy.get('@message').should('include.text', '"email"')
    })
  })

  it('validates password field', () => {
    cy.get('input[name=username]').clear().type('someone')
    cy.get('input[name=email]').clear().type('someone@example.com')
    cy.get('input[name=password]').clear().type('12345')
    cy.get('.negative').as('message')

    cy.get('@message').should('be.visible')
    cy.get('@message').get('div.header').should('not.be.visible')
    cy.get('@message').should('include.text', '"password"')
  })
})

describe('Sign up form submission', () => {
  it('should add user to gitea', () => {
    // TODO: actual submission and compare it with the admin panel on gitea.
  })
})