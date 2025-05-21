/**
 * Job Application Tracker
 * A client-side application to track job applications with data stored in localStorage
 */

// IIFE to encapsulate our application and avoid global scope pollution
(function() {
    'use strict';
  
    // Application configuration
    const CONFIG = {
      STORAGE_KEYS: {
        USERS: 'users',
        CURRENT_USER: 'currentUser'
      },
      DEFAULT_FILTER: 'all',
      DEFAULT_SORT: 'newest',
      STATUS_TYPES: ['applied', 'interview', 'offer', 'rejected']
    };
  
    // DOM element cache to reduce frequent DOM queries
    const DOM = {
      // These will be populated in the init() function
      elements: {},
      
      // Initialize the DOM cache
      init() {
        // Auth elements
        this.elements.usernameInput = document.getElementById('username');
        this.elements.passwordInput = document.getElementById('password');
        this.elements.loginBtn = document.getElementById('loginBtn');
        this.elements.registerBtn = document.getElementById('registerBtn');
        this.elements.regUsernameInput = document.getElementById('regUsername');
        this.elements.regPasswordInput = document.getElementById('regPassword');
        this.elements.submitRegBtn = document.getElementById('submitRegBtn');
        this.elements.backToLoginBtn = document.getElementById('backToLoginBtn');
        
        // App sections
        this.elements.authSection = document.getElementById('auth');
        this.elements.registerSection = document.getElementById('register');
        this.elements.jobTrackerSection = document.getElementById('jobTracker');
        
        // User display
        this.elements.userNameDisplay = document.getElementById('userNameDisplay');
        
        // Job form elements
        this.elements.jobForm = document.getElementById('jobForm');
        this.elements.companyNameInput = document.getElementById('companyName');
        this.elements.jobTitleInput = document.getElementById('jobTitle');
        this.elements.applicationDateInput = document.getElementById('applicationDate');
        this.elements.jobStatusInput = document.getElementById('jobStatus');
        this.elements.jobLocationInput = document.getElementById('jobLocation');
        this.elements.appDeadlineInput = document.getElementById('appDeadline');
        this.elements.jobNotesInput = document.getElementById('jobNotes');
        this.elements.addJobBtn = document.getElementById('addJobBtn');
        
        // Filter and search elements
        this.elements.filterStatus = document.getElementById('filterStatus');
        this.elements.sortCriteria = document.getElementById('sortCriteria');
        this.elements.searchJobs = document.getElementById('searchJobs');
        this.elements.jobCount = document.getElementById('jobCount');
        
        // Job list container
        this.elements.jobList = document.getElementById('jobList');
        
        // Stats and charts
        this.elements.jobStats = document.getElementById('jobStats');
        this.elements.statusChart = document.getElementById('statusChart');
        this.elements.recentActivity = document.getElementById('recentActivity');
        this.elements.appDeadlines = document.getElementById('appDeadlines');
        
        // Modals
        this.elements.updateStatusModal = document.getElementById('updateStatus');
        this.elements.newStatusInput = document.getElementById('newStatus');
        this.elements.statusNotesInput = document.getElementById('statusNotes');
        this.elements.updateStatusBtn = document.getElementById('updateStatusBtn');
        this.elements.closeModalBtn = document.getElementById('closeModalBtn');
        
        // Other UI components
        this.elements.logoutBtn = document.getElementById('logoutBtn');
        this.elements.exportDataBtn = document.getElementById('exportDataBtn');
        this.elements.notification = document.getElementById('notification');
        this.elements.notificationMessage = document.getElementById('notificationMessage');
        this.elements.notificationIcon = document.getElementById('notificationIcon');
        this.elements.closeNotification = document.getElementById('closeNotification');
        
        return this;
      },
      
      // Show or hide an element
      toggleDisplay(element, displayStyle = 'block') {
        if (element) {
          element.style.display = displayStyle;
        }
      }
    };
  
    // Chart controller for handling data visualization
    const ChartController = {
      statusChart: null,
      
      // Initialize the charts used in the application
      initCharts() {
        // Get the canvas context for the status chart
        const ctx = DOM.elements.statusChart?.getContext('2d');
        if (!ctx) return;
        
        // Destroy any existing chart to prevent memory leaks
        if (this.statusChart) {
          this.statusChart.destroy();
        }
        
        // Create a new chart
        this.statusChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Applied', 'Interview', 'Offer', 'Rejected'],
            datasets: [{
              data: [0, 0, 0, 0], // Will be updated later
              backgroundColor: [
                '#4361ee', // Primary color for Applied
                '#f59e0b', // Warning color for Interview
                '#10b981', // Success color for Offer
                '#ef4444', // Danger color for Rejected
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
              },
              title: {
                display: true,
                text: 'Application Status Distribution'
              }
            }
          }
        });
      },
      
      // Update the status chart with new data
      updateStatusChart(statusCounts) {
        if (!this.statusChart) return;
        
        this.statusChart.data.datasets[0].data = [
          statusCounts.applied,
          statusCounts.interview,
          statusCounts.offer,
          statusCounts.rejected
        ];
        
        this.statusChart.update();
      }
    };
  
    // Storage service to handle localStorage operations
    const StorageService = {
      // Get data from localStorage with error handling
      getData(key, defaultValue = {}) {
        try {
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
          console.error(`Error retrieving data from localStorage for key ${key}:`, error);
          return defaultValue;
        }
      },
      
      // Save data to localStorage with error handling
      saveData(key, data) {
        try {
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (error) {
          console.error(`Error saving data to localStorage for key ${key}:`, error);
          NotificationService.showNotification('Error saving data. You may be out of storage space.', 'error');
          return false;
        }
      },
      
      // Get the current user's data
      getCurrentUserData() {
        const currentUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        if (!currentUser) return null;
        
        const users = this.getData(CONFIG.STORAGE_KEYS.USERS, {});
        return users[currentUser] || null;
      },
      
      // Initialize storage for a new installation
      initStorage() {
        if (!this.getData(CONFIG.STORAGE_KEYS.USERS)) {
          this.saveData(CONFIG.STORAGE_KEYS.USERS, {});
        }
      }
    };
  
    // Authentication service for user management
    const AuthService = {
      // Set up the current user
      initialize() {
        // Check if user is already logged in
        const currentUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        if (currentUser) {
          DOM.elements.userNameDisplay.textContent = currentUser;
          return true;
        }
        return false;
      },
      
      // Login a user with validation
      login(username, password) {
        if (!username || !password) {
          NotificationService.showNotification('Please enter both username and password', 'error');
          return false;
        }
        
        const users = StorageService.getData(CONFIG.STORAGE_KEYS.USERS);
        
        if (users[username] && users[username].password === password) {
          localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, username);
          return true;
        } else {
          NotificationService.showNotification('Invalid username or password', 'error');
          return false;
        }
      },
      
      // Register a new user with validation
      register(username, password) {
        // Validate inputs
        if (!username || !password) {
          NotificationService.showNotification('Please enter both username and password', 'error');
          return false;
        }
        
        if (password.length < 6) {
          NotificationService.showNotification('Password should be at least 6 characters', 'error');
          return false;
        }
        
        const users = StorageService.getData(CONFIG.STORAGE_KEYS.USERS);
        
        if (users[username]) {
          NotificationService.showNotification('Username already exists', 'error');
          return false;
        }
        
        // Create new user with empty jobs array
        users[username] = { 
          password, 
          jobs: [],
          created: new Date().toISOString()
        };
        
        StorageService.saveData(CONFIG.STORAGE_KEYS.USERS, users);
        NotificationService.showNotification('Registration successful! You can now log in.', 'success');
        return true;
      },
      
      // Log out the current user
      logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        return true;
      }
    };
  
    // Job service to handle job operations
    const JobService = {
      // Add a new job with validation
      addJob(jobData) {
        // Validate required fields
        if (!jobData.companyName || !jobData.jobTitle || !jobData.applicationDate) {
          NotificationService.showNotification('Please fill out all required fields', 'error');
          return false;
        }
        
        const currentUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        const users = StorageService.getData(CONFIG.STORAGE_KEYS.USERS);
        
        if (currentUser && users[currentUser]) {
          // Generate a unique ID for the job
          jobData.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
          jobData.createdAt = new Date().toISOString();
          
          // Initialize jobs array if it doesn't exist
          if (!Array.isArray(users[currentUser].jobs)) {
            users[currentUser].jobs = [];
          }
          
          // Add activity record
          if (!Array.isArray(users[currentUser].activities)) {
            users[currentUser].activities = [];
          }
          
          users[currentUser].activities.unshift({
            type: 'add',
            jobTitle: jobData.jobTitle,
            company: jobData.companyName,
            date: new Date().toISOString()
          });
          
          // Limit activities to 20 entries
          if (users[currentUser].activities.length > 20) {
            users[currentUser].activities = users[currentUser].activities.slice(0, 20);
          }
          
          // Add the job
          users[currentUser].jobs.push(jobData);
          StorageService.saveData(CONFIG.STORAGE_KEYS.USERS, users);
          NotificationService.showNotification('Job application added successfully!', 'success');
          return true;
        }
        
        return false;
      },
      
      // Update job status
      updateJobStatus(index, newStatus, statusNotes) {
        const currentUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        const users = StorageService.getData(CONFIG.STORAGE_KEYS.USERS);
        
        if (!currentUser || !users[currentUser] || !Array.isArray(users[currentUser].jobs)) {
          return false;
        }
        
        if (index < 0 || index >= users[currentUser].jobs.length) {
          NotificationService.showNotification('Invalid job reference', 'error');
          return false;
        }
        
        const job = users[currentUser].jobs[index];
        const oldStatus = job.jobStatus;
        
        // Update the status
        job.jobStatus = newStatus;
        
        // Add status notes if provided
        if (statusNotes) {
          job.statusNotes = statusNotes;
        }
        
        // Add status change timestamp
        job.lastStatusUpdate = new Date().toISOString();
        
        // Add to activity log
        if (!Array.isArray(users[currentUser].activities)) {
          users[currentUser].activities = [];
        }
        
        users[currentUser].activities.unshift({
          type: 'status',
          jobTitle: job.jobTitle,
          company: job.companyName,
          oldStatus,
          newStatus,
          date: new Date().toISOString()
        });
        
        // Limit activities to 20 entries
        if (users[currentUser].activities.length > 20) {
          users[currentUser].activities = users[currentUser].activities.slice(0, 20);
        }
        
        StorageService.saveData(CONFIG.STORAGE_KEYS.USERS, users);
        NotificationService.showNotification('Job status updated successfully!', 'success');
        return true;
      },
      
      // Delete a job
      deleteJob(index) {
        const currentUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        const users = StorageService.getData(CONFIG.STORAGE_KEYS.USERS);
        
        if (!currentUser || !users[currentUser] || !Array.isArray(users[currentUser].jobs)) {
          return false;
        }
        
        // Ensure index is valid
        const numericIndex = parseInt(index, 10);
        if (isNaN(numericIndex) || numericIndex < 0 || numericIndex >= users[currentUser].jobs.length) {
          NotificationService.showNotification('Invalid job reference', 'error');
          return false;
        }
        
        // Store job info for activity log before deletion
        const deletedJob = users[currentUser].jobs[numericIndex];
        
        // Delete the job
        users[currentUser].jobs.splice(numericIndex, 1);
        
        // Add to activity log
        if (!Array.isArray(users[currentUser].activities)) {
          users[currentUser].activities = [];
        }
        
        users[currentUser].activities.unshift({
          type: 'delete',
          jobTitle: deletedJob.jobTitle,
          company: deletedJob.companyName,
          date: new Date().toISOString()
        });
        
        // Limit activities to 20 entries
        if (users[currentUser].activities.length > 20) {
          users[currentUser].activities = users[currentUser].activities.slice(0, 20);
        }
        
        StorageService.saveData(CONFIG.STORAGE_KEYS.USERS, users);
        NotificationService.showNotification('Job application deleted', 'success');
        return true;
      },
      
      // Edit job details
      updateJob(index, jobData) {
        const currentUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        const users = StorageService.getData(CONFIG.STORAGE_KEYS.USERS);
        
        if (!currentUser || !users[currentUser] || !Array.isArray(users[currentUser].jobs)) {
          return false;
        }
        
        // Validate required fields
        if (!jobData.companyName || !jobData.jobTitle || !jobData.applicationDate) {
          NotificationService.showNotification('Please fill out all required fields', 'error');
          return false;
        }
        
        // Ensure index is valid
        const numericIndex = parseInt(index, 10);
        if (isNaN(numericIndex) || numericIndex < 0 || numericIndex >= users[currentUser].jobs.length) {
          NotificationService.showNotification('Invalid job reference', 'error');
          return false;
        }
        
        // Keep the job ID and creation date
        jobData.id = users[currentUser].jobs[numericIndex].id;
        jobData.createdAt = users[currentUser].jobs[numericIndex].createdAt;
        jobData.updatedAt = new Date().toISOString();
        
        // Update the job
        users[currentUser].jobs[numericIndex] = jobData;
        
        // Add to activity log
        if (!Array.isArray(users[currentUser].activities)) {
          users[currentUser].activities = [];
        }
        
        users[currentUser].activities.unshift({
          type: 'edit',
          jobTitle: jobData.jobTitle,
          company: jobData.companyName,
          date: new Date().toISOString()
        });
        
        // Limit activities to 20 entries
        if (users[currentUser].activities.length > 20) {
          users[currentUser].activities = users[currentUser].activities.slice(0, 20);
        }
        
        StorageService.saveData(CONFIG.STORAGE_KEYS.USERS, users);
        NotificationService.showNotification('Job details updated successfully!', 'success');
        return true;
      },
      
      // Export user data as JSON
      exportData() {
        const currentUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        const users = StorageService.getData(CONFIG.STORAGE_KEYS.USERS);
        
        if (!currentUser || !users[currentUser]) {
          NotificationService.showNotification('No data to export', 'error');
          return null;
        }
        
        const exportData = {
          username: currentUser,
          exportDate: new Date().toISOString(),
          jobs: users[currentUser].jobs
        };
        
        // Create a blob and download link
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `job_applications_${currentUser}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        NotificationService.showNotification('Data exported successfully!', 'success');
        return true;
      }
    };
  
    // UI controller to handle UI updates
    const UIController = {
      // Initialize UI elements
      init() {
        // Set default values if they exist
        const filterElement = DOM.elements.filterStatus;
        const sortElement = DOM.elements.sortCriteria;
        const searchElement = DOM.elements.searchJobs;
        
        if (filterElement) filterElement.value = CONFIG.DEFAULT_FILTER;
        if (sortElement) sortElement.value = CONFIG.DEFAULT_SORT;
        if (searchElement) searchElement.value = '';
        
        return this;
      },
      
      // Show the login form
      showLoginForm() {
        DOM.toggleDisplay(DOM.elements.registerSection, 'none');
        DOM.toggleDisplay(DOM.elements.authSection, 'block');
        DOM.toggleDisplay(DOM.elements.jobTrackerSection, 'none');
        
        // Clear login form
        if (DOM.elements.usernameInput) DOM.elements.usernameInput.value = '';
        if (DOM.elements.passwordInput) DOM.elements.passwordInput.value = '';
      },
      
      // Show the registration form
      showRegisterForm() {
        DOM.toggleDisplay(DOM.elements.authSection, 'none');
        DOM.toggleDisplay(DOM.elements.registerSection, 'block');
        DOM.toggleDisplay(DOM.elements.jobTrackerSection, 'none');
        
        // Clear registration form
        if (DOM.elements.regUsernameInput) DOM.elements.regUsernameInput.value = '';
        if (DOM.elements.regPasswordInput) DOM.elements.regPasswordInput.value = '';
      },
      
      // Show the job tracker main app
      showJobTracker() {
        DOM.toggleDisplay(DOM.elements.authSection, 'none');
        DOM.toggleDisplay(DOM.elements.registerSection, 'none');
        DOM.toggleDisplay(DOM.elements.jobTrackerSection, 'block');
        
        // Display current user's name
        const currentUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        if (currentUser && DOM.elements.userNameDisplay) {
          DOM.elements.userNameDisplay.textContent = currentUser;
        }
        
        // Reset filters to defaults
        this.resetFilters();
        
        // Initialize charts
        ChartController.initCharts();
        
        // Update dashboard data
        this.updateJobStats();
        this.updateRecentActivity();
        this.updateDeadlines();
        this.filterAndDisplayJobs();
      },
      
      // Clear job form after submission
      clearJobForm() {
        const formElements = [
          'companyNameInput', 'jobTitleInput', 'applicationDateInput', 
          'jobStatusInput', 'jobLocationInput', 'appDeadlineInput', 'jobNotesInput'
        ];
        
        formElements.forEach(element => {
          if (DOM.elements[element]) {
            DOM.elements[element].value = '';
          }
        });
      },
      
      // Reset filter and sort values
      resetFilters() {
        if (DOM.elements.filterStatus) DOM.elements.filterStatus.value = CONFIG.DEFAULT_FILTER;
        if (DOM.elements.sortCriteria) DOM.elements.sortCriteria.value = CONFIG.DEFAULT_SORT;
        if (DOM.elements.searchJobs) DOM.elements.searchJobs.value = '';
      },
      
      // Filter, sort and display jobs
      filterAndDisplayJobs() {
        const userData = StorageService.getCurrentUserData();
        const jobList = DOM.elements.jobList;
        
        if (!jobList || !userData || !Array.isArray(userData.jobs)) {
          return;
        }
        
        // Clear the job list
        jobList.innerHTML = '';
        
        // Get filter and sort values
        const filterValue = DOM.elements.filterStatus?.value || CONFIG.DEFAULT_FILTER;
        const sortValue = DOM.elements.sortCriteria?.value || CONFIG.DEFAULT_SORT;
        const searchValue = DOM.elements.searchJobs?.value?.toLowerCase() || '';
        
        // Create a copy of jobs for filtering and sorting
        let filteredJobs = [...userData.jobs];
        
        // Apply search filter
        if (searchValue) {
          filteredJobs = filteredJobs.filter(job => 
            job.companyName?.toLowerCase().includes(searchValue) || 
            job.jobTitle?.toLowerCase().includes(searchValue) ||
            job.jobNotes?.toLowerCase().includes(searchValue) ||
            job.jobLocation?.toLowerCase().includes(searchValue)
          );
        }
        
        // Apply status filter
        if (filterValue !== 'all') {
          filteredJobs = filteredJobs.filter(job => job.jobStatus === filterValue);
        }
        
        // Apply sorting
        switch (sortValue) {
          case 'newest':
            filteredJobs.sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate));
            break;
          case 'oldest':
            filteredJobs.sort((a, b) => new Date(a.applicationDate) - new Date(b.applicationDate));
            break;
          case 'companyAZ':
            filteredJobs.sort((a, b) => a.companyName.localeCompare(b.companyName));
            break;
          case 'companyZA':
            filteredJobs.sort((a, b) => b.companyName.localeCompare(a.companyName));
            break;
          case 'titleAZ':
            filteredJobs.sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
            break;
          case 'titleZA':
            filteredJobs.sort((a, b) => b.jobTitle.localeCompare(a.jobTitle));
            break;
          case 'deadline':
            // Sort by deadline, putting those without deadlines at the end
            filteredJobs.sort((a, b) => {
              if (!a.appDeadline && !b.appDeadline) return 0;
              if (!a.appDeadline) return 1;
              if (!b.appDeadline) return -1;
              return new Date(a.appDeadline) - new Date(b.appDeadline);
            });
            break;
        }
        
        // Display count
        if (DOM.elements.jobCount) {
          DOM.elements.jobCount.textContent = filteredJobs.length;
        }
        
        // Check if we have results
        if (filteredJobs.length === 0) {
          jobList.innerHTML = '<div class="no-results"><i class="fas fa-search"></i> No job applications match your filters.</div>';
          return;
        }
        
        // Display the filtered jobs
        filteredJobs.forEach((job, index) => {
          // Find original index for proper reference
          const originalIndex = userData.jobs.findIndex(j => 
            (j.id && j.id === job.id) || 
            (j.companyName === job.companyName && 
            j.jobTitle === job.jobTitle && 
            j.applicationDate === job.applicationDate)
          );
          
          // Format the application date
          const appDate = new Date(job.applicationDate).toLocaleDateString();
          
          // Create job item element
          const jobItem = document.createElement('div');
          jobItem.className = 'job-item';
          
          // Format deadline if it exists
          let deadlineHtml = '';
          if (job.appDeadline) {
            const deadlineDate = new Date(job.appDeadline);
            const today = new Date();
            const isUpcoming = deadlineDate > today && 
                              (deadlineDate - today) / (1000 * 60 * 60 * 24) <= 7;
            
            deadlineHtml = `
              <p>Deadline: 
                <span class="${isUpcoming ? 'deadline-date' : ''}">
                  ${new Date(job.appDeadline).toLocaleDateString()}
                </span>
              </p>
            `;
          }
          
          // Build the job item HTML
          jobItem.innerHTML = `
            <h3>${this.escapeHtml(job.jobTitle)} at ${this.escapeHtml(job.companyName)}</h3>
            <p>Application Date: ${appDate}</p>
            <p>Status: <span class="status-${job.jobStatus}">${this.capitalizeFirst(job.jobStatus)}</span></p>
            ${job.jobLocation ? `<p>Location: ${this.escapeHtml(job.jobLocation)}</p>` : ''}
            ${deadlineHtml}
            ${job.jobNotes ? `<p>Notes: ${this.escapeHtml(job.jobNotes)}</p>` : ''}
            <div class="job-buttons">
              <button class="btn-secondary edit-job-btn" data-index="${originalIndex}">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn-secondary update-status-btn" data-index="${originalIndex}">
                <i class="fas fa-tasks"></i> Status
              </button>
              <button class="btn-secondary delete-job-btn" data-index="${originalIndex}">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          `;
          
          jobList.appendChild(jobItem);
        });
        
        // Set up event listeners for the job buttons
        this.setupJobButtonEvents();
      },
      
      // Update job statistics in the dashboard
      updateJobStats() {
        const userData = StorageService.getCurrentUserData();
        const statsContainer = DOM.elements.jobStats;
        
        if (!statsContainer || !userData || !Array.isArray(userData.jobs)) {
          return;
        }
        
        const totalJobs = userData.jobs.length;
        
        // Count jobs by status
        const statusCounts = {
          applied: 0,
          interview: 0,
          offer: 0,
          rejected: 0
        };
        
        userData.jobs.forEach(job => {
          if (statusCounts.hasOwnProperty(job.jobStatus)) {
            statusCounts[job.jobStatus]++;
          }
        });
        
        // Update the stats display
        statsContainer.innerHTML = `
          <div class="stat-item"><span>Total:</span> ${totalJobs}</div>
          <div class="stat-item"><span>Applied:</span> ${statusCounts.applied}</div>
          <div class="stat-item"><span>Interview:</span> ${statusCounts.interview}</div>
          <div class="stat-item"><span>Offer:</span> ${statusCounts.offer}</div>
          <div class="stat-item"><span>Rejected:</span> ${statusCounts.rejected}</div>
        `;
        
        // Update chart with the new data
        ChartController.updateStatusChart(statusCounts);
      },
      
      // Update recent activity section
      updateRecentActivity() {
        const userData = StorageService.getCurrentUserData();
        const activityContainer = DOM.elements.recentActivity;
        
        if (!activityContainer || !userData || !Array.isArray(userData.activities)) {
          return;
        }
        
        // Clear container
        activityContainer.innerHTML = '';
        
        // If no activities, show message
        if (userData.activities.length === 0) {
          activityContainer.innerHTML = '<div class="activity-item">No recent activity</div>';
          return;
        }
        
        // Display recent activities (up to 5)
        const recentActivities = userData.activities.slice(0, 5);
        
        recentActivities.forEach(activity => {
          const activityItem = document.createElement('div');
          activityItem.className = 'activity-item';
          
          // Format the date
          const activityDate = new Date(activity.date).toLocaleString();
          
          // Create message based on activity type
          let message = '';
          switch (activity.type) {
            case 'add':
              message = `Applied to <strong>${this.escapeHtml(activity.jobTitle)}</strong> at <strong>${this.escapeHtml(activity.company)}</strong>`;
              break;
            case 'status':
              message = `Updated <strong>${this.escapeHtml(activity.jobTitle)}</strong> status from <strong>${this.capitalizeFirst(activity.oldStatus)}</strong> to <strong>${this.capitalizeFirst(activity.newStatus)}</strong>`;
              break;
              case 'delete':
            message = `Deleted <strong>${this.escapeHtml(activity.jobTitle)}</strong> application at <strong>${this.escapeHtml(activity.company)}</strong>`;
            break;
          case 'edit':
            message = `Edited <strong>${this.escapeHtml(activity.jobTitle)}</strong> application at <strong>${this.escapeHtml(activity.company)}</strong>`;
            break;
          default:
            message = `Activity related to <strong>${this.escapeHtml(activity.jobTitle)}</strong> at <strong>${this.escapeHtml(activity.company)}</strong>`;
        }
        
        activityItem.innerHTML = `
          <div class="activity-icon">
            <i class="fas ${this.getActivityIcon(activity.type)}"></i>
          </div>
          <div class="activity-details">
            <p>${message}</p>
            <small>${activityDate}</small>
          </div>
        `;
        
        activityContainer.appendChild(activityItem);
      });
    },
    
    // Helper to get appropriate icon for activity type
    getActivityIcon(activityType) {
      switch (activityType) {
        case 'add': return 'fa-plus-circle';
        case 'status': return 'fa-exchange-alt';
        case 'delete': return 'fa-trash';
        case 'edit': return 'fa-edit';
        default: return 'fa-circle';
      }
    },
    
    // Update application deadlines section
    updateDeadlines() {
      const userData = StorageService.getCurrentUserData();
      const deadlineContainer = DOM.elements.appDeadlines;
      
      if (!deadlineContainer || !userData || !Array.isArray(userData.jobs)) {
        return;
      }
      
      // Clear container
      deadlineContainer.innerHTML = '';
      
      // Filter jobs with deadlines and future date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for proper comparison
      
      // Get jobs with upcoming deadlines (within next 14 days)
      const upcomingDeadlines = userData.jobs
        .filter(job => job.appDeadline && new Date(job.appDeadline) >= today)
        .sort((a, b) => new Date(a.appDeadline) - new Date(b.appDeadline));
      
      // If no upcoming deadlines, show message
      if (upcomingDeadlines.length === 0) {
        deadlineContainer.innerHTML = '<div class="deadline-item">No upcoming deadlines</div>';
        return;
      }
      
      // Display deadlines (max 5)
      const displayDeadlines = upcomingDeadlines.slice(0, 5);
      
      displayDeadlines.forEach(job => {
        const deadlineDate = new Date(job.appDeadline);
        const isUrgent = (deadlineDate - today) / (1000 * 60 * 60 * 24) <= 3;
        
        const deadlineItem = document.createElement('div');
        deadlineItem.className = `deadline-item ${isUrgent ? 'urgent' : ''}`;
        
        // Calculate days remaining
        const daysRemaining = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
        const daysText = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
        
        deadlineItem.innerHTML = `
          <div class="deadline-icon">
            <i class="fas fa-calendar-day"></i>
          </div>
          <div class="deadline-details">
            <p><strong>${this.escapeHtml(job.jobTitle)}</strong> at <strong>${this.escapeHtml(job.companyName)}</strong></p>
            <p>Deadline: ${deadlineDate.toLocaleDateString()}</p>
            <small class="${isUrgent ? 'urgent-text' : ''}">${daysText} remaining</small>
          </div>
        `;
        
        deadlineContainer.appendChild(deadlineItem);
      });
    },
    
    // Set up event listeners for job items' buttons
    setupJobButtonEvents() {
      // Edit job buttons
      const editButtons = document.querySelectorAll('.edit-job-btn');
      editButtons.forEach(button => {
        button.addEventListener('click', this.handleEditJob.bind(this));
      });
      
      // Update status buttons
      const statusButtons = document.querySelectorAll('.update-status-btn');
      statusButtons.forEach(button => {
        button.addEventListener('click', this.handleStatusUpdate.bind(this));
      });
      
      // Delete job buttons
      const deleteButtons = document.querySelectorAll('.delete-job-btn');
      deleteButtons.forEach(button => {
        button.addEventListener('click', this.handleDeleteJob.bind(this));
      });
    },
    
    // Handle Edit Job button click
    handleEditJob(event) {
      // Get the job index from the button's data attribute
      const index = event.currentTarget.dataset.index;
      const userData = StorageService.getCurrentUserData();
      
      if (!userData || !Array.isArray(userData.jobs) || index >= userData.jobs.length) {
        NotificationService.showNotification('Could not find job details', 'error');
        return;
      }
      
      const job = userData.jobs[index];
      
      // Populate the form with job details
      DOM.elements.companyNameInput.value = job.companyName;
      DOM.elements.jobTitleInput.value = job.jobTitle;
      DOM.elements.applicationDateInput.value = this.formatDateForInput(job.applicationDate);
      DOM.elements.jobStatusInput.value = job.jobStatus;
      DOM.elements.jobLocationInput.value = job.jobLocation || '';
      DOM.elements.appDeadlineInput.value = job.appDeadline ? this.formatDateForInput(job.appDeadline) : '';
      DOM.elements.jobNotesInput.value = job.jobNotes || '';
      
      // Scroll to the form
      DOM.elements.jobForm.scrollIntoView({ behavior: 'smooth' });
      
      // Change the form submit button
      const addJobBtn = DOM.elements.addJobBtn;
      addJobBtn.innerHTML = '<i class="fas fa-save"></i> Update Application';
      addJobBtn.classList.add('update-mode');
      addJobBtn.dataset.editIndex = index;
      
      // Focus on the company name field
      DOM.elements.companyNameInput.focus();
    },
    
    // Handle update status button click
    handleStatusUpdate(event) {
      // Get the job index
      const index = event.currentTarget.dataset.index;
      
      // Store the index in the modal for later use
      DOM.elements.updateStatusBtn.dataset.jobIndex = index;
      
      // Get current status to set as default
      const userData = StorageService.getCurrentUserData();
      if (userData && Array.isArray(userData.jobs) && userData.jobs[index]) {
        DOM.elements.newStatus.value = userData.jobs[index].jobStatus;
        DOM.elements.statusNotes.value = '';
      }
      
      // Show the modal
      DOM.toggleDisplay(DOM.elements.updateStatus, 'flex');
    },
    
    // Handle delete job button click
    handleDeleteJob(event) {
      const index = event.currentTarget.dataset.index;
      
      // Get job details for confirmation message
      const userData = StorageService.getCurrentUserData();
      if (!userData || !Array.isArray(userData.jobs) || index >= userData.jobs.length) {
        NotificationService.showNotification('Could not find job details', 'error');
        return;
      }
      
      const job = userData.jobs[index];
      
      // Ask for confirmation
      if (confirm(`Are you sure you want to delete the ${job.jobTitle} application at ${job.companyName}?`)) {
        // Delete the job if confirmed
        JobService.deleteJob(index);
        
        // Refresh the view
        this.updateJobStats();
        this.updateRecentActivity();
        this.updateDeadlines();
        this.filterAndDisplayJobs();
      }
    },
    
    // Format a date string for input fields (YYYY-MM-DD)
    formatDateForInput(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    },
    
    // Helper function to capitalize first letter
    capitalizeFirst(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    // Escape HTML to prevent XSS attacks
    escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };

  // Notification service to show toast messages
  const NotificationService = {
    // Show a notification toast
    showNotification(message, type = 'info') {
      const notificationEl = DOM.elements.notification;
      const messageEl = DOM.elements.notificationMessage;
      const iconEl = DOM.elements.notificationIcon;
      
      if (!notificationEl || !messageEl || !iconEl) return;
      
      // Set message and icon based on type
      messageEl.innerHTML = message;
      
      // Clear existing classes and add appropriate class
      iconEl.className = 'fas';
      
      switch (type) {
        case 'success':
          iconEl.classList.add('fa-check-circle');
          notificationEl.className = 'notification notification-success';
          break;
        case 'error':
          iconEl.classList.add('fa-exclamation-circle');
          notificationEl.className = 'notification notification-error';
          break;
        case 'warning':
          iconEl.classList.add('fa-exclamation-triangle');
          notificationEl.className = 'notification notification-warning';
          break;
        default:
          iconEl.classList.add('fa-info-circle');
          notificationEl.className = 'notification notification-info';
      }
      
      // Show the notification
      DOM.toggleDisplay(notificationEl, 'flex');
      
      // Auto-hide after 4 seconds
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = setTimeout(() => {
        DOM.toggleDisplay(notificationEl, 'none');
      }, 4000);
    }
  };

  // Event binding to handle all application interactions
  const EventBinding = {
    // Initialize all event listeners
    init() {
      // Auth form events
      this.bindAuthEvents();
      
      // Job form events
      this.bindJobFormEvents();
      
      // Filter and search events
      this.bindFilterEvents();
      
      // Modal events
      this.bindModalEvents();
      
      // Notification events
      this.bindNotificationEvents();
    },
    
    // Bind auth related events
    bindAuthEvents() {
      // Login button click
      DOM.elements.loginBtn?.addEventListener('click', () => {
        const username = DOM.elements.usernameInput?.value;
        const password = DOM.elements.passwordInput?.value;
        
        if (AuthService.login(username, password)) {
          UIController.showJobTracker();
        }
      });
      
      // Register button click
      DOM.elements.registerBtn?.addEventListener('click', () => {
        UIController.showRegisterForm();
      });
      
      // Submit registration button click
      DOM.elements.submitRegBtn?.addEventListener('click', () => {
        const username = DOM.elements.regUsernameInput?.value;
        const password = DOM.elements.regPasswordInput?.value;
        
        if (AuthService.register(username, password)) {
          UIController.showLoginForm();
        }
      });
      
      // Back to login button click
      DOM.elements.backToLoginBtn?.addEventListener('click', () => {
        UIController.showLoginForm();
      });
      
      // Logout button click
      DOM.elements.logoutBtn?.addEventListener('click', () => {
        if (AuthService.logout()) {
          UIController.showLoginForm();
        }
      });
      
      // Export data button click
      DOM.elements.exportDataBtn?.addEventListener('click', () => {
        JobService.exportData();
      });
    },
    
    // Bind job form events
    bindJobFormEvents() {
      // Job form submission
      DOM.elements.jobForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Check if we're updating an existing job
        const addJobBtn = DOM.elements.addJobBtn;
        const isUpdate = addJobBtn?.classList.contains('update-mode');
        const editIndex = isUpdate ? addJobBtn?.dataset.editIndex : null;
        
        // Collect form data
        const jobData = {
          companyName: DOM.elements.companyNameInput?.value,
          jobTitle: DOM.elements.jobTitleInput?.value,
          applicationDate: DOM.elements.applicationDateInput?.value,
          jobStatus: DOM.elements.jobStatusInput?.value,
          jobLocation: DOM.elements.jobLocationInput?.value,
          appDeadline: DOM.elements.appDeadlineInput?.value,
          jobNotes: DOM.elements.jobNotesInput?.value
        };
        
        let success = false;
        
        if (isUpdate && editIndex !== null) {
          // Update existing job
          success = JobService.updateJob(editIndex, jobData);
          
          // Reset button to normal state
          addJobBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Application';
          addJobBtn.classList.remove('update-mode');
          delete addJobBtn.dataset.editIndex;
        } else {
          // Add new job
          success = JobService.addJob(jobData);
        }
        
        if (success) {
          UIController.clearJobForm();
          UIController.updateJobStats();
          UIController.updateRecentActivity();
          UIController.updateDeadlines();
          UIController.filterAndDisplayJobs();
        }
      });
    },
    
    // Bind filter, sort and search events
    bindFilterEvents() {
      const filterElements = ['filterStatus', 'sortCriteria', 'searchJobs'];
      
      filterElements.forEach(elementId => {
        const element = DOM.elements[elementId];
        if (!element) return;
        
        // Add appropriate event listener based on element type
        if (elementId === 'searchJobs') {
          // Debounce search to avoid too many refreshes
          let searchTimeout;
          element.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
              UIController.filterAndDisplayJobs();
            }, 300);
          });
        } else {
          // Immediate refresh for dropdowns
          element.addEventListener('change', () => {
            UIController.filterAndDisplayJobs();
          });
        }
      });
    },
    
    // Bind modal events
    bindModalEvents() {
      // Close modal button
      DOM.elements.closeModalBtn?.addEventListener('click', () => {
        DOM.toggleDisplay(DOM.elements.updateStatus, 'none');
      });
      
      // Close modal when clicking away
      window.addEventListener('click', (event) => {
        if (event.target === DOM.elements.updateStatus) {
          DOM.toggleDisplay(DOM.elements.updateStatus, 'none');
        }
      });
      
      // Update status button in modal
      DOM.elements.updateStatusBtn?.addEventListener('click', () => {
        const jobIndex = DOM.elements.updateStatusBtn.dataset.jobIndex;
        const newStatus = DOM.elements.newStatus?.value;
        const statusNotes = DOM.elements.statusNotes?.value;
        
        // Update job status
        if (JobService.updateJobStatus(jobIndex, newStatus, statusNotes)) {
          // Hide the modal
          DOM.toggleDisplay(DOM.elements.updateStatus, 'none');
          
          // Refresh UI
          UIController.updateJobStats();
          UIController.updateRecentActivity();
          UIController.filterAndDisplayJobs();
        }
      });
    },
    
    // Bind notification events
    bindNotificationEvents() {
      // Close notification button
      DOM.elements.closeNotification?.addEventListener('click', () => {
        DOM.toggleDisplay(DOM.elements.notification, 'none');
      });
    }
  };

  // Main application initialization
  const App = {
    init() {
      // Initialize storage
      StorageService.initStorage();
      
      // Initialize DOM cache
      DOM.init();
      
      // Initialize UI controller
      UIController.init();
      
      // Set up event listeners
      EventBinding.init();
      
      // Check if user is already logged in
      if (AuthService.initialize()) {
        UIController.showJobTracker();
      } else {
        UIController.showLoginForm();
      }
    }
  };

  // Start the application when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', App.init);
})();