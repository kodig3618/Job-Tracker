document.getElementById('loginButton').addEventListener('click', login);
document.getElementById('registerButton').addEventListener('click', register);
document.getElementById('showRegisterForm').addEventListener('click', showRegisterForm);
document.getElementById('showLoginForm').addEventListener('click', showLoginForm);
document.getElementById('addJobButton').addEventListener('click', addJob);
document.getElementById('logoutButton').addEventListener('click', logout);

function showRegisterForm() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('resgister').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('register').style.display = 'none';
    document.getElementById('auth').style.display = 'block';
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const users = JSON.parse(localStorage.getItem('users')) || {};

    if (users[username] && users[username].password === password) {
        localStorage.setItem('currentUser', username);
        showJobTracker();
    } else {
        alert('Invalid username or password');
    }
}
function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const users = JSON.parse(localStorage.getItem('users')) || {};

    if (!users[username]) {
        users[username] = { password, jobs: [] };
        localStorage.setItem('users', JSON.stringify(users));
        alert('Registration successful! You can now log in.');
        showLoginForm();
} else {
        alert('Username already exists. Please choose a different one.');
    }
}

function showJobTracker() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('register').style.display = 'none';
    document.getElementById('jobTracker').style.display = 'block';
    loadJobs();
}
function addJobs () {
    const companyName = document.getElementById('companyName').value;
    const jobTitle = document.getElementById('jobTitle').value;
    const applicationDate = document.getElementById('applicationDate').value;
    const jobStatus = document.getElementById('JobStatus').value;
    const jobNotes = document.getElementById('jobNotes').value;

    const job = {
        companyName,
        jobTitle,
        applicationDate,
        jobStatus,
        jobNotes
    };
    const currentUser = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('users'));

    users[currentUser].jobs.push(job);
    localStorage.setItem('users', JSON.stringify(users));
    loadJobs();

    //clear input fields
    document.getElementById('companyName').value = '';
    document.getElementById('jobTitle').value = '';
    document.getElementById('applicationDate').value = '';
    document.getElementById('jobStatus').value = '';
    document.getElementById('jobNotes').value = '';
}

function loadJobs() {
    const currentUser = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('users'));
    const jobList = document.getElementById('jobList');
    jobList.innerHTML = '';

    users[currentUser].jobs.forEach((job, index) => {
        const jobItem = document.createElement('div');
        jobItem.innerHTML = `
            <h3>${job.jobTitle} at ${job.companyName}</h3>
            <p>Application Date: ${job.applicationDate}</p>
            <p>Status: ${job.jobStatus}</p>
            <p>Notes: ${job.jobNotes}</p>
            <button onclick="showUpdateStatusModal(${index})">Update Status</button>
            <button onclick="deleteJob(${index})">Delete</button>
        `;
        jobList.appendChild(jobItem);
    });
}

function showUpdateStatusModal(index) {
    const modal = document.getElementById('updateStatusModal');
    modal.style.display = 'block';
    document.getElementById('updateStatusButton').onclick = () => updateJobStatus(index);
}

function updateJobStatus(index) {
    const newStatus = document.getElementById('newStatus').value;
    const currentUser = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('users'));

    if (newStatus) {
        users[currentUser].jobs[index].jobStatus = newStatus;
        localStorage.setItem('users', JSON.stringify(users));
        loadJobs();
        closeModal();
    }
}

function closeModal() {
    const modal = document.getElementById('updateStatusModal');
    modal.style.display = 'none';
}

function deleteJob(index) {
    const currentUser = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('users'));

    users[currentUser].jobs.splice(index, 1);
    localStorage.setItem('users', JSON.stringify(users));
    loadJobs();
}

function logout(){
    localStorage.removeItem('currentUser');
    document.getElementById('jobTracker').style.display = 'none';
    document.getElementById('auth').style.display = 'block';
}

if (localStorage.getItem('currentUser')) {
    showJobTracker();
}

window.onclick = function(event) {
    const modal = document.getElementById('updateStatusModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

