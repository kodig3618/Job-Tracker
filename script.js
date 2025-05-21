// Global state
let currentFilter = 'all';
let currentSort = 'newest';

// Utility Functions
function $(id) {
    return document.getElementById(id);
}

function toggleDisplay(id, style) {
    const el = $(id);
    if (el) el.style.display = style;
}

function getLocalStorageData(key, defaultVal = {}) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
}

function setLocalStorageData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function addEvent(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Auth buttons
    addEvent('loginBtn', 'click', login);
    addEvent('submitRegBtn', 'click', register);
    addEvent('registerBtn', 'click', showRegisterForm);
    addEvent('backToLoginBtn', 'click', showLoginForm);
    addEvent('logoutBtn', 'click', logout);

    // Form submission
    addEvent('jobForm', 'submit', e => {
        e.preventDefault();
        addJob();
    });

    // Job filters
    ['filterStatus', 'sortCriteria', 'searchJobs'].forEach(id => {
        const el = $(id);
        if (el) {
            const evt = id === 'searchJobs' ? 'input' : 'change';
            el.addEventListener(evt, applyFilterAndSort);
        }
    });

    addEvent('updateStatusBtn', 'click', updateJobStatus); // assume implementation
    addEvent('closeModalBtn', 'click', closeModal); // assume implementation

    // App initialization
    if (!localStorage.getItem('users')) {
        setLocalStorageData('users', {});
    }

    if (localStorage.getItem('currentUser')) {
        showJobTracker();
    } else {
        showLoginForm();
    }
});

// Auth
function showRegisterForm() {
    toggleDisplay('auth', 'none');
    toggleDisplay('register', 'block');
}

function showLoginForm() {
    toggleDisplay('register', 'none');
    toggleDisplay('auth', 'block');
}

function login() {
    const username = $('username').value.trim();
    const password = $('password').value.trim();
    const users = getLocalStorageData('users');

    if (!username || !password) {
        alert('Please enter both username and password.');
        return;
    }

    if (users[username] && users[username].password === password) {
        localStorage.setItem('currentUser', username);
        showJobTracker();
    } else {
        alert('Invalid username or password.');
    }
}

function register() {
    const username = $('regUsername').value.trim();
    const password = $('regPassword').value.trim();
    const users = getLocalStorageData('users');

    if (!username || !password) {
        alert('Username and password are required.');
        return;
    }

    if (users[username]) {
        alert('Username already exists. Please choose another.');
    } else {
        users[username] = { password, jobs: [] };
        setLocalStorageData('users', users);
        alert('Registration successful! Please log in.');
        showLoginForm();
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    toggleDisplay('jobTracker', 'none');
    showLoginForm();
}

// Job Tracker
function showJobTracker() {
    const user = localStorage.getItem('currentUser');
    if (!user) return;

    $('userNameDisplay').textContent = user;
    toggleDisplay('auth', 'none');
    toggleDisplay('register', 'none');
    toggleDisplay('jobTracker', 'block');

    // Reset filters
    if ($('filterStatus')) $('filterStatus').value = 'all';
    if ($('sortCriteria')) $('sortCriteria').value = 'newest';
    if ($('searchJobs')) $('searchJobs').value = '';

    updateJobStats();
    applyFilterAndSort();
}

function addJob() {
    const job = {
        id: Date.now().toString(),
        companyName: $('companyName').value.trim(),
        jobTitle: $('jobTitle').value.trim(),
        applicationDate: $('applicationDate').value,
        jobStatus: $('jobStatus').value,
        jobNotes: $('jobNotes').value.trim()
    };

    if (!job.companyName || !job.jobTitle || !job.applicationDate) {
        alert('Please fill out all required fields.');
        return;
    }

    const user = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');

    if (!users[user].jobs) users[user].jobs = [];
    users[user].jobs.push(job);
    setLocalStorageData('users', users);

    clearJobForm();
    applyFilterAndSort();
    updateJobStats();
}

function clearJobForm() {
    ['companyName', 'jobTitle', 'applicationDate', 'jobStatus', 'jobNotes'].forEach(id => {
        $(id).value = '';
    });
}

function updateJobStats() {
    const user = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');
    const jobs = users[user]?.jobs || [];

    const total = jobs.length;
    const applied = jobs.filter(j => j.jobStatus === 'Applied').length;
    const interviewing = jobs.filter(j => j.jobStatus === 'Interviewing').length;
    const offered = jobs.filter(j => j.jobStatus === 'Offered').length;

    $('totalJobs').textContent = total;
    $('appliedJobs').textContent = applied;
    $('interviewJobs').textContent = interviewing;
    $('offeredJobs').textContent = offered;
}

// Job Filter/Sort
function applyFilterAndSort() {
    const user = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');
    const jobs = [...(users[user]?.jobs || [])];
    const jobList = $('jobList');
    if (!jobList) return;

    // Get filter/sort values
    const filter = $('filterStatus')?.value || 'all';
    const sort = $('sortCriteria')?.value || 'newest';
    const search = $('searchJobs')?.value.toLowerCase() || '';

    currentFilter = filter;
    currentSort = sort;

    let filtered = jobs;

    if (search) {
        filtered = filtered.filter(j =>
            j.companyName.toLowerCase().includes(search) ||
            j.jobTitle.toLowerCase().includes(search)
        );
    }

    if (filter !== 'all') {
        filtered = filtered.filter(j => j.jobStatus === filter);
    }

    switch (sort) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.applicationDate) - new Date(b.applicationDate));
            break;
        case 'companyAZ':
            filtered.sort((a, b) => a.companyName.localeCompare(b.companyName));
            break;
        case 'companyZA':
            filtered.sort((a, b) => b.companyName.localeCompare(a.companyName));
            break;
        case 'titleAZ':
            filtered.sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
            break;
        case 'titleZA':
            filtered.sort((a, b) => b.jobTitle.localeCompare(a.jobTitle));
            break;
    }

    jobList.innerHTML = '';

    if (filtered.length === 0) {
        jobList.innerHTML = `<div class="no-results">No job applications match your filters.</div>`;
        return;
    }

    filtered.forEach(job => {
        const item = document.createElement('div');
        item.className = 'job-item';
        item.innerHTML = `
            <h3>${job.jobTitle} at ${job.companyName}</h3>
            <p><strong>Date:</strong> ${job.applicationDate}</p>
            <p><strong>Status:</strong> ${job.jobStatus}</p>
            <p><strong>Notes:</strong> ${job.jobNotes || 'None'}</p>
        `;
        jobList.appendChild(item);
    });
}


