# AI Coding Policy — TSX + Tailwind CSS

> \*\*For AI agents:\*\* Read this entire document before generating any code for this project.
> This policy ensures generated code is readable and maintainable by developers
> coming from HTML, CSS, Bootstrap, and JavaScript/JSX backgrounds.

\---

## 1\. Who This Is For

The developers on this project understand:

* HTML tags, attributes, and page structure
* CSS properties, classes, and selectors
* Bootstrap grid (`.container`, `.row`, `.col-md-6`) and utility classes
* JavaScript (functions, events, DOM, arrays)
* Basic JSX (writing HTML-like syntax inside JS/React components)

They are **learning** TypeScript and Tailwind CSS. Generated code must bridge that gap — never assume deep TS or Tailwind expertise.

\---

## 2\. Clean Code Philosophy

> \*\*The goal is clean, not perfect.\*\*
> Code that a teammate can read, understand, and fix at 11pm without calling you — that's the target.
> Not award-winning architecture. Not the most clever solution. Just honest, readable code.

### What "clean" means on this project

**Readable over clever.**
If you have to think twice about what a line does, rewrite it. A longer but obvious solution beats a short but cryptic one every time.

```js
// ✗ Clever — but what does this do?
const val = arr.reduce((a, b) => ({ ...a, \[b.id]: b }), {})

// ✓ Clear — anyone can follow this
const itemsById = {}
for (const item of arr) {
  itemsById\[item.id] = item
}
```

**Consistent over creative.**
Pick one way to do something and do it that way everywhere. Inconsistency is what makes codebases hard to navigate — not imperfection.

```js
// ✗ Inconsistent — three styles for the same thing
const getName = (user) => user.name
function getEmail(user) { return user.email }
const getRole = function(user) { return user.role }

// ✓ Consistent — one style throughout
function getName(user) { return user.name }
function getEmail(user) { return user.email }
function getRole(user) { return user.role }
```

**Obvious over terse.**
Use full, descriptive names. Saving keystrokes costs understanding.

```js
// ✗ Terse — what is u? what is d? what is fn?
const fn = (u) => u.d > Date.now()

// ✓ Obvious — reads like a sentence
function isSubscriptionActive(user) {
  return user.expiryDate > Date.now()
}
```

**Working over polished.**
A function that works and is slightly messy is better than a beautifully structured function that has a bug. Clean up after it works, not before.

### What "clean" does NOT mean on this project

* ❌ Every edge case handled upfront — handle what you know, add a `// TODO` for the rest
* ❌ Maximum abstraction — don't create a helper function for something used once
* ❌ Perfect file organization — good enough structure that the team agrees on beats perfect structure nobody follows
* ❌ Zero duplication — a little copy-paste is fine if abstracting it makes the code harder to read
* ❌ Latest patterns — use what the team understands, not what just dropped in a blog post

### The one question to ask before committing code

> \*\*"Could a teammate who didn't write this understand it in under 30 seconds?"\*\*
> If yes — ship it. If no — rename a variable, add a comment, or split a function.

\---

## 3\. TypeScript Rules

### 2.1 Always Define Types for Props

Every component must have a named `type` or `interface` for its props. Never use implicit `any` or skip prop types.

```tsx
// ✗ Avoid — no types, hard to understand
function Card({ title, count }) {
  return <div>{title}: {count}</div>
}

// ✓ Do this — props are documented by the type
type CardProps = {
  title: string       // the card heading text
  count: number       // number to display
  isActive?: boolean  // optional — highlights the card if true
}

function Card({ title, count, isActive = false }: CardProps) {
  return <div>{title}: {count}</div>
}
```

### 2.2 Use Simple, Readable Types First

Prefer basic types before reaching for advanced TS features. Developers from a JS background should be able to read the types without a TypeScript manual.

```tsx
// Primitive types
name: string
age: number
isVisible: boolean

// Arrays (like JS arrays, just typed)
items: string\[]
scores: number\[]

// Optional props (the ? means "not required")
description?: string

// Union — this OR that (like an enum in plain English)
status: "active" | "inactive" | "pending"
size: "sm" | "md" | "lg"
```

### 2.3 Comment Non-Obvious Types

If a type isn't self-explanatory, add a short inline comment. Think of it as documentation for the next developer.

```tsx
type UserCardProps = {
  userId: string           // unique DB identifier, e.g. "usr\_abc123"
  role: "admin" | "staff"  // controls which menu items are visible
  joinedAt: Date           // used to calculate "member since" text
}
```

### 2.4 Avoid `any` — Use `unknown` or a Real Type

`any` disables TypeScript's safety net entirely. If the type is truly unknown (e.g. API response), use `unknown` and narrow it.

```tsx
// ✗ Avoid
function process(data: any) { ... }

// ✓ Better — forces a check before use
function process(data: unknown) {
  if (typeof data === "string") {
    console.log(data.toUpperCase())
  }
}
```

### 2.5 Type Event Handlers Explicitly

Developers from a JS background are used to `onclick` and `addEventListener`. In React TSX, events have specific types — always spell them out.

```tsx
import { ChangeEvent, MouseEvent } from "react"

// Input change — like oninput in HTML
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value)
}

// Button click — like onclick in HTML
const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
  e.preventDefault()
}
```

\---

## 4\. Component Structure Rules

### 3.1 One Component Per File

Each component lives in its own file. The file name matches the component name in PascalCase.

```
src/
  components/
    Navbar.tsx        ← <Navbar /> component
    PolicyCard.tsx    ← <PolicyCard /> component
    Footer.tsx        ← <Footer /> component
  pages/
    Home.tsx
    About.tsx
  App.tsx
```

### 3.2 Component Anatomy — Always in This Order

Structure every component the same way so any developer can scan it quickly.

```tsx
// 1. Imports
import { useState } from "react"

// 2. Type definitions (props, local types)
type PolicyCardProps = {
  title: string
  category: string
}

// 3. Component function
export default function PolicyCard({ title, category }: PolicyCardProps) {

  // 4. State \& variables (like JS let/const at the top of a function)
  const \[isOpen, setIsOpen] = useState(false)

  // 5. Event handlers (named functions, not inline logic)
  function handleToggle() {
    setIsOpen(!isOpen)
  }

  // 6. Return — the JSX (think of this as your HTML template)
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={handleToggle}>
        {isOpen ? "Close" : "Read more"}
      </button>
    </div>
  )
}
```

### 3.3 No Anonymous Inline Functions for Complex Logic

Keep the JSX clean. Move logic into named handler functions above the return.

```tsx
// ✗ Avoid — hard to read and debug
<button onClick={() => {
  if (user.role === "admin") {
    setVisible(true)
    fetchData(user.id)
  }
}}>
  Open
</button>

// ✓ Do this — logic is named and easy to find
function handleOpen() {
  if (user.role === "admin") {
    setVisible(true)
    fetchData(user.id)
  }
}

<button onClick={handleOpen}>Open</button>
```

\---

## 5\. Tailwind CSS Rules

> \*\*Bridge to Bootstrap:\*\* Tailwind is like Bootstrap utilities, but more granular. Instead of `.btn.btn-primary`, you compose multiple small classes. Think of each Tailwind class as one CSS property.

### 4.1 Tailwind ↔ Bootstrap Mental Model

|What you want|Bootstrap class|Tailwind equivalent|
|-|-|-|
|Container|`container`|`max-w-5xl mx-auto px-4`|
|Row|`row`|`flex flex-wrap gap-4`|
|6-column grid|`col-md-6`|`w-full md:w-1/2`|
|Margin top 3|`mt-3`|`mt-3` (same!)|
|Padding x 4|`px-4`|`px-4` (same!)|
|Hidden on mobile|`d-none d-md-block`|`hidden md:block`|
|Flex center|`d-flex justify-content-center`|`flex justify-center`|
|Bold text|`fw-bold`|`font-bold`|
|Text muted|`text-muted`|`text-slate-400`|
|Card|`card`|`bg-white rounded-xl border border-slate-200 shadow-sm p-4`|
|Primary button|`btn btn-primary`|`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700`|

### 4.2 Spacing Scale

Tailwind spacing maps to `4px` increments. This replaces writing custom `margin` and `padding` in CSS.

```
p-1  = padding: 4px      (like Bootstrap's p-1)
p-2  = padding: 8px
p-4  = padding: 16px     (like Bootstrap's p-3)
p-6  = padding: 24px
p-8  = padding: 32px

gap-4 = 16px gap between flex/grid children
```

### 4.3 Responsive Prefixes

Tailwind uses `sm:`, `md:`, `lg:` prefixes — same breakpoints as Bootstrap, different syntax.

```tsx
// Bootstrap: <div class="col-12 col-md-6 col-lg-4">
// Tailwind:
<div className="w-full md:w-1/2 lg:w-1/3">
```

Mobile-first: base class applies to all sizes, prefix overrides at that breakpoint and above.

### 4.4 Use `className`, Not `class`

In JSX/TSX, HTML's `class` attribute becomes `className`. This is a JSX rule, not Tailwind.

```tsx
// ✗ Wrong — this is HTML, not JSX
<div class="flex items-center">

// ✓ Correct
<div className="flex items-center">
```

### 4.5 Avoid Arbitrary Values Unless Necessary

Tailwind has a design system built in. Use it before reaching for custom values with brackets.

```tsx
// ✗ Avoid — breaks out of the design system
<div className="w-\[347px] mt-\[13px] text-\[#2a4b8d]">

// ✓ Use scale values
<div className="w-80 mt-3 text-blue-800">
```

### 4.6 Use Tailwind Classes — Never Inline `style` for Colors or Spacing

Always use Tailwind classes instead of inline `style` props for colors, spacing, borders, and typography. Inline styles bypass the design system, break consistency, and are harder to scan.

The only acceptable use of `style` is for values that have no Tailwind equivalent — such as custom `fontFamily`, non-standard `fontSize`, or precise `letterSpacing` values.

```tsx
// ✗ Avoid — inline styles bypass the design system
<div style={{ color: 'rgb(17,24,39)', backgroundColor: '#0077BE', border: '2px solid #0077BE' }}>

// ✓ Use Tailwind and brand classes
<div className="text-gray-900 bg-brand-blue border-2 border-brand-blue">

// ✗ Avoid — hardcoded color hex in SVG attributes
<svg fill="#0077BE">

// ✓ Use fill utility class
<svg className="fill-brand-blue">

// ✓ Acceptable — no Tailwind equivalent exists for these
<h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', letterSpacing: '0.1em' }}>
```

**Brand color classes available in this project:**

| Class | Color |
|---|---|
| `text-brand-blue` / `bg-brand-blue` / `border-brand-blue` / `fill-brand-blue` | `#0077BE` |
| `text-brand-blue-dark` / `bg-brand-blue-dark` | `#0065A5` |
| `text-brand-orange` / `bg-brand-orange` | `#F47C2C` |

**Common Tailwind color replacements for gray shades:**

| Inline style | Tailwind class |
|---|---|
| `color: 'rgb(17,24,39)'` | `text-gray-900` |
| `color: 'rgb(31,41,55)'` | `text-gray-800` |
| `color: 'rgb(55,65,81)'` | `text-gray-700` |
| `color: 'rgb(75,85,99)'` | `text-gray-600` |
| `color: 'rgb(107,114,128)'` | `text-gray-500` |
| `backgroundColor: 'rgb(229,231,235)'` | `bg-gray-200` |
| `border: '1px solid rgb(229,231,235)'` | `border border-gray-200` |

### 4.7 Group Classes Logically

Long class strings are hard to scan. Order them: layout → spacing → typography → color → interaction.

```tsx
// ✗ Random order — hard to read
<button className="text-white hover:bg-blue-700 px-4 bg-blue-600 rounded-lg font-medium py-2">

// ✓ Logical order: layout → spacing → text → color → states
<button className="flex items-center gap-2 px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
```

\---

## 6\. JSX Rules

### 5.1 JSX Is Your HTML Template

Think of the `return (...)` block in a component as your HTML file. The same rules apply — semantic tags, proper nesting, accessibility.

```tsx
// Map Bootstrap page structure to JSX
// Bootstrap HTML:                    JSX equivalent:
// <div class="container">   →        <div className="max-w-5xl mx-auto px-4">
// <div class="row">         →        <div className="flex flex-wrap gap-4">
// <nav class="navbar">      →        <nav className="...">
```

### 5.2 Always Return One Root Element

JSX must have a single root element. Use a `<div>`, a semantic tag, or a Fragment `<>...</>` if you don't want extra markup.

```tsx
// ✗ Error — two root elements
return (
  <h1>Title</h1>
  <p>Body</p>
)

// ✓ Wrap in a Fragment (renders no extra HTML tag)
return (
  <>
    <h1>Title</h1>
    <p>Body</p>
  </>
)
```

### 5.3 Use `.map()` for Lists — Always Add a `key`

In JS you'd use a `for` loop to build HTML. In JSX, use `.map()`. Every item needs a unique `key` prop.

```tsx
// JS/HTML way (what they know):
// for (let item of items) {
//   html += `<li>${item.name}</li>`
// }

// JSX way:
<ul>
  {items.map((item) => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>
```

### 5.4 Conditional Rendering

Use `\&\&` for show/hide and ternary `? :` for if/else — just like in JS.

```tsx
// Show only if condition is true (like if statement)
{isLoggedIn \&\& <UserMenu />}

// Show one thing or another (like if/else)
{isLoading ? <Spinner /> : <Content />}
```

\---

## 7\. Accessibility Rules (Required for Non-Profit / Gov)

These are not optional. Government and non-profit projects must meet WCAG 2.1 AA standards.

```tsx
// Every image needs alt text
<img src="logo.png" alt="Organization logo" />
// Decorative images get empty alt
<img src="divider.png" alt="" />

// Form inputs need labels — link with htmlFor (not "for" — that's JSX)
<label htmlFor="email">Email address</label>
<input id="email" type="email" />

// Buttons need descriptive text or aria-label
<button aria-label="Close dialog">×</button>

// Use semantic tags — screen readers depend on them
<header> <nav> <main> <section> <footer>
// Not just <div> for everything
```

\---

## 8\. File Naming Conventions

|File type|Convention|Example|
|-|-|-|
|Component|PascalCase|`PolicyCard.tsx`|
|Page|PascalCase|`HomePage.tsx`|
|Utility/helper|camelCase|`formatDate.ts`|
|Types file|camelCase|`types.ts` or `policyTypes.ts`|
|Styles (global)|kebab-case|`global.css`|
|Assets|kebab-case|`hero-banner.png`|

\---

## 9\. Comments Policy

Write comments that explain **why**, not **what**. The code shows what it does.

```tsx
// ✗ Useless — obvious from the code
// set isOpen to true
setIsOpen(true)

// ✓ Useful — explains a non-obvious decision
// Bootstrap columns use 12-unit grid; Tailwind doesn't,
// so we use fractional widths (1/3 = \~4 col, 1/2 = 6 col)
<div className="w-full md:w-1/3">

// Use TODO for known issues
// TODO: replace with real API call once backend is ready
const data = mockPolicies
```

\---

## 10\. JavaScript Structure Rules

> \*\*For AI agents:\*\* Even inside TSX files, the logic layer is still JavaScript. Follow these rules so developers coming from a plain JS background can read and maintain the code without confusion.

### 9.1 File Anatomy — Always in This Order

Every `.js` or `.ts` utility file must follow this structure so any developer can navigate it predictably.

```js
// 1. Imports at the very top
import { formatDate } from "./formatDate"

// 2. Constants — fixed values that never change
const MAX\_ITEMS = 10
const API\_URL = "https://api.example.com"

// 3. Helper / utility functions
function formatName(first, last) {
  return `${first} ${last}`
}

// 4. Main logic / exported functions
export function getUserFullName(user) {
  return formatName(user.firstName, user.lastName)
}
```

### 9.2 Variable Declarations — `const` First, `let` When Needed, Never `var`

Developers from a JS background often default to `var`. This project forbids it.

```js
// ✗ Never use var — it has function scope and causes bugs
var name = "Ada"

// ✓ Use const by default — value won't be reassigned
const name = "Ada"
const items = \[]         // even arrays and objects use const

// ✓ Use let only when the value will change
let count = 0
count = count + 1        // count changes, so let is correct
```

### 9.3 Function Naming — Verb + Noun

Function names must describe what they do. Use a verb + noun pattern so the purpose is obvious without reading the body.

```js
// ✗ Avoid — tells you nothing
function data() { }
function doStuff(x) { }
function handler() { }

// ✓ Verb + noun — self-documenting
function getUsers() { }
function formatDate(date) { }
function handleSubmit(event) { }
function validateEmail(email) { }
function fetchPolicyById(id) { }
```

### 9.4 Keep Functions Small — One Job Per Function

If a function does more than one thing, split it. A good function fits on one screen.

```js
// ✗ Avoid — this function does too many things
function processUser(user) {
  // validates
  if (!user.email) return false
  // formats
  user.name = user.name.trim().toUpperCase()
  // saves
  localStorage.setItem("user", JSON.stringify(user))
  // redirects
  window.location.href = "/dashboard"
}

// ✓ Split into focused functions
function isValidUser(user) {
  return !!user.email
}

function formatUser(user) {
  return { ...user, name: user.name.trim().toUpperCase() }
}

function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user))
}
```

### 9.5 Early Returns — Avoid Deep Nesting

Developers from a Bootstrap/HTML background often write deeply nested `if` blocks. Use early returns to flatten logic.

```js
// ✗ Avoid — hard to follow, deeply nested
function getDiscount(user) {
  if (user) {
    if (user.isActive) {
      if (user.role === "admin") {
        return 0.5
      } else {
        return 0.1
      }
    } else {
      return 0
    }
  } else {
    return 0
  }
}

// ✓ Early returns — reads top to bottom like a checklist
function getDiscount(user) {
  if (!user) return 0
  if (!user.isActive) return 0
  if (user.role === "admin") return 0.5
  return 0.1
}
```

### 9.6 Array Methods Over `for` Loops

Use modern array methods. They are shorter, more readable, and chain together naturally.

```js
const users = \[
  { name: "Ada", active: true },
  { name: "Alan", active: false },
  { name: "Grace", active: true },
]

// ✗ Old for loop style
let activeNames = \[]
for (let i = 0; i < users.length; i++) {
  if (users\[i].active) {
    activeNames.push(users\[i].name.toUpperCase())
  }
}

// ✓ Modern — filter then map
const activeNames = users
  .filter(user => user.active)
  .map(user => user.name.toUpperCase())

// Common array methods to know:
// .map()     — transform every item → new array
// .filter()  — keep only items that match a condition
// .find()    — get the first item that matches
// .some()    — true if any item matches
// .every()   — true if all items match
// .reduce()  — collapse array into a single value
```

### 9.7 Async / Await Over `.then()` Chains

For API calls and async operations, use `async/await` with `try/catch`. It reads like synchronous code — easier for JS beginners to follow.

```js
// ✗ Avoid — .then() chains get hard to read
fetch("/api/policies")
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err))

// ✓ async/await — reads top to bottom
async function fetchPolicies() {
  try {
    const res = await fetch("/api/policies")
    const data = await res.json()
    return data
  } catch (error) {
    // Always handle errors — tell the user something went wrong
    console.error("Failed to fetch policies:", error)
    return \[]
  }
}
```

### 9.8 Destructuring — Cleaner Variable Extraction

Destructuring is like unpacking a box. Use it instead of repeatedly writing `object.property`.

```js
// ✗ Repetitive
const name = user.name
const email = user.email
const role = user.role

// ✓ Destructure in one line
const { name, email, role } = user

// Works in function parameters too
// ✗ Without destructuring
function greet(user) {
  return `Hello ${user.name}, your role is ${user.role}`
}

// ✓ With destructuring
function greet({ name, role }) {
  return `Hello ${name}, your role is ${role}`
}

// Arrays too
const \[first, second] = \["Ada", "Alan"]
```

### 9.9 Spread Operator — Copy Without Mutating

Use `...` to copy objects and arrays instead of mutating the original. This is especially important in React where direct mutation breaks re-renders.

```js
// ✗ Mutating directly — breaks React state
user.name = "Ada"
items.push(newItem)

// ✓ Spread — creates a new copy
const updatedUser = { ...user, name: "Ada" }
const updatedItems = \[...items, newItem]

// Remove an item by filtering
const withoutItem = items.filter(item => item.id !== targetId)
```

### 9.10 Error Handling — Always Tell the User

Never silently swallow errors. Always handle them and communicate failure to the UI.

```js
// ✗ Silent failure — user has no idea what happened
async function loadData() {
  const res = await fetch("/api/data")
  return res.json()
}

// ✓ Handle and surface the error
async function loadData() {
  try {
    const res = await fetch("/api/data")
    if (!res.ok) throw new Error(`Server error: ${res.status}`)
    return await res.json()
  } catch (error) {
    console.error("loadData failed:", error)
    return null   // caller checks for null and shows error UI
  }
}
```

\---

## 11\. What AI Should Generate (Summary Checklist)

Before outputting any code, the AI agent must verify:

**TSX + Tailwind**

* \[ ] Props have a named `type` or `interface` with inline comments
* \[ ] No `any` types — use real types or `unknown`
* \[ ] Event handlers are named functions, not inline logic
* \[ ] Tailwind classes follow Bootstrap-equivalent patterns where possible
* \[ ] No inline `style` props for color, spacing, or borders — use Tailwind/brand classes instead
* \[ ] `style` prop used only for values with no Tailwind equivalent (e.g. custom `fontFamily`, `fontSize`)
* \[ ] Classes are ordered: layout → spacing → typography → color → states
* \[ ] `className` used (not `class`)
* \[ ] Components follow the 6-step anatomy (imports → types → function → state → handlers → return)
* \[ ] Lists use `.map()` with a `key` prop
* \[ ] Semantic HTML tags used (`<header>`, `<nav>`, `<main>`, etc.)
* \[ ] Accessibility attributes present (`alt`, `htmlFor`, `aria-label` where needed)
* \[ ] One component per file, PascalCase filename
* \[ ] Comments explain non-obvious decisions only

**JavaScript Structure**

* \[ ] `const` by default, `let` only when value changes, never `var`
* \[ ] Functions named with verb + noun pattern (e.g. `fetchPolicies`, `formatDate`)
* \[ ] Each function does one job — split if it does more
* \[ ] Early returns used to avoid deep nesting
* \[ ] Array methods (`.map()`, `.filter()`, `.find()`) used over `for` loops
* \[ ] Async operations use `async/await` with `try/catch`
* \[ ] Destructuring used for cleaner object/array access
* \[ ] Spread operator used instead of direct mutation
* \[ ] Errors are caught and surfaced — no silent failures
* \[ ] JS files follow order: imports → constants → helpers → exports

\---
*AI agents must re-read this file at the start of each session before generating code.*

