/* eslint-disable no-console */
/* eslint-disable prefer-template */
'use strict'

class DeclarativeJSON {
  constructor(template, appContext) {
    if (typeof template === 'string')
      try {
        template = JSON.parse(template)
      } catch (err) {
        console.warn('[Invalid JSON]')
        return this
      }

    this.parsedTemplate = parseTemplate(template, appContext)
  }

  get template() {
    return this.parsedTemplate
  }

  render(renderFn) {
    if (!this.parsedTemplate)
      return null

    if (typeof renderFn === 'function')
      return renderFn(this.parsedTemplate)

    return render(this.parsedTemplate)
  }
}

function parseTemplate(element, appContext) {
  let parsedElement = {}

  if (typeof element !== 'object')
    return console.warn('Unknown element type', typeof element)

  for (let el of Object.keys(element)) {
    if (isInternal(el))
      continue

    if (!parsedElement[el])
      parsedElement[el] = {}

    if (typeof element[el] === 'string') {
      parsedElement[el].tags = false
      parsedElement[el].content = element[el]
    }

    if (typeof element[el] === 'object' && !Array.isArray(element[el])) {
      element[el].context = appContext && appContext[el] || {}
      let condition = shouldRender(element[el], appContext)
      if (condition) {
        parsedElement[el].content = renderElement(element[el], condition, appContext)
      } else if (typeof condition === 'boolean' && !condition)
        continue
      else
        parsedElement[el].content = parseTemplate(element[el], appContext)

      // Retrieve any element props
      parseProps(parsedElement[el], element[el])

      continue
    }
  }

  return parsedElement
}

function isInternal(el) {
  // Filter internals
  if (
    el === 'condition' ||
    el === 'content' ||
    el === 'context' ||
    el === 'tag' ||
    el === 'tags' ||
    el == 'props'
  )
    return true

  return false
}

function parseProps(parsedElement, element) {
  if (element.tag)
    parsedElement.tag = element.tag

  if (element.tags)
    parsedElement.tags = element.tags

  if (element.props)
    parsedElement.props = element.props
}

function shouldRender(el, appContext) {
  if (typeof el.condition === 'function')
    return el.condition(el.context, appContext)
  else
    return el.condition
}

function renderElement(el, condition, appContext) {
  if (typeof el.content === 'object') {
    if (typeof el.content[condition] === 'function')
      return el.content[condition](el.context, appContext)
  }
}

function render(element) {
  let toRender = ''

  if (typeof element === 'object') {
    for (let el of Object.keys(element)) {
      if (isInternal(el))
        continue

      // If tags are turned off, replace tag with content
      if (typeof element[el].tags === 'boolean' && !element[el].tags) {
        toRender += element[el].content
        continue
      }

      let openingTag = '<' + el + '>'
      let closingTag = '</' + el + '>'

      if (element[el].tag) {
        openingTag = '<' + element[el].tag + '>'
        closingTag = '</' + element[el].tag + '>'
      }

      if (element[el].tags) {
        openingTag = element[el].tags[0]
        closingTag = element[el].tags[1]
      }

      // Parse any tag properties
      if (typeof element[el].props === 'object' && !Array.isArray(element[el])) {
        toRender += openingTag.slice(null, -1)
        for (let prop of Object.keys(element[el].props)) {
          toRender += ' ' + prop + '="' + element[el].props[prop] + '"'
        }
        toRender += '>'
      } else
        toRender += openingTag

      // Recurse if needed
      if (typeof element[el].content === 'object')
        toRender += render(element[el].content)
      else
        toRender += element[el].content

      toRender += closingTag
    }
  }

  return toRender
}

// If environment is not browser, export it (for node compatibility)
if (typeof window === 'undefined')
  module.exports = DeclarativeJSON
