// Event Listeners
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('submitRegBtn').addEventListener('click', register);
document.getElementById('registerBtn').addEventListener('click', showRegisterForm);
document.getElementById('backToLoginBtn').addEventListener('click', showLoginForm);
document.getElementById('jobForm').addEventListener('submit', function(e) {
    e.preventDefault();
    addJob();
});
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('updateStatusBtn').addEventListener('click', updateJobStatus);
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('saveEditBtn')?.addEventListener('click', saveEditedJob);
document.getElementById('closeEditModalBtn')?.addEventListener('click', closeEditModal);
window.addEventListener('click', closeModalOnOutsideClick);

// Utility Functions
function toggleDisplay(elementId, displayStyle) {
    document.getElementById(elementId).style.display = displayStyle;
}

function getLocalStorageData(key, defaultValue = {}) {
    return JSON.parse(localStorage.getItem(key)) || defaultValue;
}

function setLocalStorageData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Authentication Functions
function showRegisterForm() {
    toggleDisplay('auth', 'none');
    toggleDisplay('register', 'block');
}

function showLoginForm() {
    toggleDisplay('register', 'none');
    toggleDisplay('auth', 'block');
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const users = getLocalStorageData('users');

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
    const users = getLocalStorageData('users');

    if (!users[username]) {
        users[username] = { password, jobs: [] };
        setLocalStorageData('users', users);
        alert('Registration successful! You can now log in.');
        showLoginForm();
    } else {
        alert('Username already exists. Please choose a different one.');
    }
}

// Job Tracker Functions
function showJobTracker() {
    document.getElementById('userNameDisplay').textContent = localStorage.getItem('currentUser');
    toggleDisplay('auth', 'none');
    toggleDisplay('register', 'none');
    toggleDisplay('jobTracker', 'block');
    loadJobs();
}

function addJob() {
    const job = {
        companyName: document.getElementById('companyName').value,
        jobTitle: document.getElementById('jobTitle').value,
        applicationDate: document.getElementById('applicationDate').value,
        jobStatus: document.getElementById('jobStatus').value,
        jobNotes: document.getElementById('jobNotes').value,
    };

    const currentUser = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');

    if (currentUser && users[currentUser]) {
        users[currentUser].jobs.push(job);
        setLocalStorageData('users', users);
        loadJobs();
        clearJobForm();
    }
}

function clearJobForm() {
    ['companyName', 'jobTitle', 'applicationDate', 'jobStatus', 'jobNotes'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

function loadJobs() {
    const currentUser = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');
    const jobList = document.getElementById('jobList');
    jobList.innerHTML = '';

    if (currentUser && users[currentUser]) {
        users[currentUser].jobs.forEach((job, index) => {
            const jobItem = document.createElement('div');
            jobItem.innerHTML = `
                <h3>${job.jobTitle} at ${job.companyName}</h3>
                <p>Application Date: ${job.applicationDate}</p>
                <p>Status: ${job.jobStatus}</p>
                <p>Notes: ${job.jobNotes}</p>
                <div class="job-buttons">
                    <button class="edit-job-btn" data-index="${index}">Edit</button>
                    <button class="update-status-btn" data-index="${index}">Update Status</button>
                    <button class="delete-job-btn" data-index="${index}">Delete</button>
                </div>
            `;
            jobList.appendChild(jobItem);
        });

        // Attach event listeners to dynamically created buttons
        document.querySelectorAll('.update-status-btn').forEach(button => {
            button.addEventListener('click', () => showUpdateStatusModal(button.dataset.index));
        });
        document.querySelectorAll('.delete-job-btn').forEach(button => {
            button.addEventListener('click', () => deleteJob(button.dataset.index));
        });
        document.querySelectorAll('.edit-job-btn').forEach(button => {
            button.addEventListener('click', () => showEditJobModal(button.dataset.index));
        });
    }
}

function showUpdateStatusModal(index) {
    const modal = document.getElementById('updateStatus');
    toggleDisplay('updateStatus', 'block');
    
    // Store the index on the update button for later use
    document.getElementById('updateStatusBtn').dataset.index = index;
    
    // Pre-select the current status if needed
    const currentUser = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');
    if (currentUser && users[currentUser]) {
        const currentStatus = users[currentUser].jobs[index].jobStatus;
        document.getElementById('newStatus').value = currentStatus;
    }
}

function updateJobStatus() {
    const index = document.getElementById('updateStatusBtn').dataset.index;
    const newStatus = document.getElementById('newStatus').value;
    const currentUser = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');

    if (newStatus && currentUser && users[currentUser]) {
        users[currentUser].jobs[index].jobStatus = newStatus;
        setLocalStorageData('users', users);
        loadJobs();
        closeModal();
    }
}

function closeModal() {
    toggleDisplay('updateStatus', 'none');
}

function closeModalOnOutsideClick(event) {
    const modal = document.getElementById('updateStatus');
    const editModal = document.getElementById('editJobModal');
    if (event.target === modal) {
        closeModal();
    }
    if (event.target === editModal) {
        closeEditModal();
    }
}

function deleteJob(index) {
    const currentUser = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');

    if (currentUser && users[currentUser]) {
        if (confirm('Are you sure you want to delete this job application?')) {
            users[currentUser].jobs.splice(index, 1);
            setLocalStorageData('users', users);
            loadJobs();
        }
    }
}

// New functions for editing jobs
function showEditJobModal(index) {
    // Create modal if it doesn't exist
    if (!document.getElementById('editJobModal')) {
        createEditJobModal();
    }
    
    const modal = document.getElementById('editJobModal');
    const currentUser = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');
    
    if (currentUser && users[currentUser]) {
        const job = users[currentUser].jobs[index];
        
        // Populate form fields with current job data
        document.getElementById('editCompanyName').value = job.companyName;
        document.getElementById('editJobTitle').value = job.jobTitle;
        document.getElementById('editApplicationDate').value = job.applicationDate;
        document.getElementById('editJobStatus').value = job.jobStatus;
        document.getElementById('editJobNotes').value = job.jobNotes;
        
        // Store the index for later use
        document.getElementById('saveEditBtn').dataset.index = index;
        
        // Show the modal
        toggleDisplay('editJobModal', 'block');
    }
}

function createEditJobModal() {
    const modalDiv = document.createElement('div');
    modalDiv.id = 'editJobModal';
    modalDiv.className = 'modal';
    
    modalDiv.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" id="closeEditModalBtn">&times;</span>
            <h3>Edit Job Application</h3>
            <form id="editJobForm">
                <input type="text" id="editCompanyName" placeholder="Company Name" aria-label="Company Name" required>
                <input type="text" id="editJobTitle" placeholder="Job Title" aria-label="Job Title" required>
                <input type="date" id="editApplicationDate" aria-label="Application Date" required>
                <select id="editJobStatus" aria-label="Job Status">
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                </select>
                <textarea id="editJobNotes" placeholder="Notes" aria-label="Job Notes"></textarea>
                <button type="button" id="saveEditBtn">Save Changes</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    
    // Add event listeners for the new modal
    document.getElementById('saveEditBtn').addEventListener('click', saveEditedJob);
    document.getElementById('closeEditModalBtn').addEventListener('click', closeEditModal);
}

function saveEditedJob() {
    const index = document.getElementById('saveEditBtn').dataset.index;
    const currentUser = localStorage.getItem('currentUser');
    const users = getLocalStorageData('users');
    
    if (currentUser && users[currentUser]) {
        // Update the job with edited values
        users[currentUser].jobs[index] = {
            companyName: document.getElementById('editCompanyName').value,
            jobTitle: document.getElementById('editJobTitle').value,
            applicationDate: document.getElementById('editApplicationDate').value,
            jobStatus: document.getElementById('editJobStatus').value,
            jobNotes: document.getElementById('editJobNotes').value
        };
        
        // Save to localStorage and refresh the job list
        setLocalStorageData('users', users);
        loadJobs();
        closeEditModal();
    }
}

function closeEditModal() {
    toggleDisplay('editJobModal', 'none');
}

function logout() {
    localStorage.removeItem('currentUser');
    toggleDisplay('jobTracker', 'none');
    toggleDisplay('auth', 'block');
}

// Initialize
if (localStorage.getItem('currentUser')) {
    showJobTracker();
} else {
    // Initialize users object if it doesn't exist
    if (!localStorage.getItem('users')) {
        setLocalStorageData('users', {});
    }
}
