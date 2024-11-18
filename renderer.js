const urlInput = document.getElementById("url")
const submitButton = document.getElementById("submit")
const questions = document.getElementById("info-qcount")
const smartscore = document.getElementById("info-smartscore")

const loadingScreen = document.getElementById("loading")
const loadingStatus = document.getElementById("loading-status")

const loginScreen = document.getElementById("login-screen")
const loginForm = document.getElementById("login-form")

const AIkeyScreen = document.getElementById("aikey-screen")
const AIkeyForm = document.getElementById("aikey-form")

const questionStatus = document.getElementById("question-status")

const image = document.getElementById("image")

setLoading(true, "Waiting for login page to load")

submitButton.addEventListener("click", () => {
    const url = urlInput.value
    window.ixlSolver.sendUrl(url)
    urlInput.style.display = "none"
    submitButton.style.display = "none"
})


window.ixlSolver.onInfo((value) => {
    questions.textContent = value.qcount
    smartscore.textContent = value.smartscore
    image.src = `data:image/png;base64,${value.image}`
})

window.ixlSolver.onResult((value) => {
    console.log(value)
})

window.ixlSolver.onStatus((value) => {
    if(value !== "ready"){
        setLoading(true, value)
    }
    else{
        setLoading(false, value)
    }
})

window.ixlSolver.onLoginRequest((value) => {
    if (!loginScreen.style.display || loginScreen.style.display === "none") {
        loginScreen.style.display = "flex"

        loginForm.username.value = localStorage.getItem("username") || ""
        loginForm.password.value = localStorage.getItem("password") || ""
    }
})

window.ixlSolver.onLoginResult((value) => {
    console.log(value)
    loginScreen.style.display = "none"
})

window.ixlSolver.onAIRequest((value) => {
    if (!AIkeyScreen.style.display || AIkeyScreen.style.display === "none") {
        AIkeyScreen.style.display = "flex"

        AIkeyForm.aiKey.value = localStorage.getItem("aiKey") || ""
        AIkeyForm.aiType.value = localStorage.getItem("aiType") || "claude"
    }
})

window.ixlSolver.onAIResult((value) => {
    console.log(value)
    AIkeyScreen.style.display = "none"
})


window.ixlSolver.onQuestionStatus((value) => {
    questionStatus.textContent = value
})

window.ixlSolver.onUrlRequest((doShow) => {
    urlInput.style.display = doShow ? "inline" : "none"
    submitButton.style.display = doShow ? "inline" : "none"
    questionStatus.textContent = ""
})

AIkeyForm.addEventListener("submit", (event) => {
    event.preventDefault()

    const key = document.getElementById("aiKey").value
    const aiType = document.getElementById("aiType").value
    window.ixlSolver.sendAIKey([aiType, key])
    AIkeyScreen.style.display = "none"

    localStorage.setItem("aiKey", key)
    localStorage.setItem("aiType", aiType)
})

loginForm.addEventListener("submit", (event) => {
    event.preventDefault()

    const username = document.getElementById("username").value
    const password = document.getElementById("password").value

    localStorage.setItem("username", username)
    localStorage.setItem("password", password)

    window.ixlSolver.sendLogin([ username, password ])
})

function setLoading(isLoading, status) {
    loadingScreen.style.display = isLoading ? "flex" : "none"
    loadingStatus.textContent = status
}

function vineboom(wrong = false) {
    const boom = document.getElementById("wrong-boom")
    boom.style.display = wrong ? "flex" : "none"
    boom.style.animation = "vineboom 0.25s forwards"

    setTimeout(() => {
        boom.style.display = "none"
        boom.style.animation = ""
    }, 2500)
}
