let API_ENDPOINT = '';
const STATUS_CHOICES = ['Unreviewed', 'Accepted', 'Waitlist', 'Denied', 'Draft'];

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.dashboard-container');
    API_ENDPOINT = container.dataset.apiUrl;

    document.getElementById('status-filter').addEventListener('change', fetchDashboardData);
    document.getElementById('refresh-btn').addEventListener('click', fetchDashboardData);

    await fetchDashboardData();
});

async function fetchDashboardData() {
    const selectedStatus = document.getElementById('status-filter').value;
    const url = selectedStatus
        ? `${API_ENDPOINT}?status=${encodeURIComponent(selectedStatus)}`
        : API_ENDPOINT;

    updateStatus('Status: Fetching telemetry...', true);

    try {
        const response = await fetch(url, {
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        renderStats(data.stats);
        renderTable(data.submissions);

        const filterLabel = selectedStatus ? ` [Filter: ${selectedStatus}]` : '';
        updateStatus(`Status: 200 OK — Loaded ${data.submissions.length} records${filterLabel}`, true);
    } catch (err) {
        console.error('Dashboard fetch error:', err);
        updateStatus('Status: Error loading dashboard data', false);
    }
}

function renderStats(stats) {
    document.getElementById('stat-applicants').textContent = stats.num_applicants ?? 0;
    document.getElementById('stat-total').textContent = stats.total_forms ?? 0;
    document.getElementById('stat-unreviewed').textContent = stats.unreviewed ?? 0;
    document.getElementById('stat-accepted').textContent = stats.accepted ?? 0;
    document.getElementById('stat-waitlisted').textContent = stats.waitlisted ?? 0;
    document.getElementById('stat-denied').textContent = stats.denied ?? 0;
}

function renderTable(submissions) {
    const tbody = document.getElementById('submissions-tbody');
    tbody.innerHTML = '';

    if (!submissions || submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No submissions found for this filter.</td></tr>';
        return;
    }

    submissions.forEach(item => {
        const tr = document.createElement('tr');

        // Applicant cell
        const tdApplicant = document.createElement('td');
        const nameStrong = document.createElement('strong');
        nameStrong.textContent = `${item.first_name} ${item.last_name}`;
        const emailSpan = document.createElement('div');
        emailSpan.className = 'help-text';
        emailSpan.style.fontSize = '0.75rem';
        emailSpan.textContent = item.email;
        tdApplicant.appendChild(nameStrong);
        tdApplicant.appendChild(emailSpan);

        // School cell
        const tdSchool = document.createElement('td');
        tdSchool.textContent = item.school;

        // Timestamp cell
        const tdTime = document.createElement('td');
        tdTime.textContent = item.timestamp;

        // Status badge cell
        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `badge badge-${item.status}`;
        badge.textContent = item.status;
        tdStatus.appendChild(badge);

        // Actions cell (inline status dropdown + link to full admin change form)
        const tdAction = document.createElement('td');
        const actionGroup = document.createElement('div');
        actionGroup.className = 'action-group';

        const select = document.createElement('select');
        select.className = 'status-select';
        STATUS_CHOICES.forEach(choice => {
            const opt = document.createElement('option');
            opt.value = choice;
            opt.textContent = choice;
            if (choice === item.status) opt.selected = true;
            select.appendChild(opt);
        });

        select.addEventListener('change', (e) => handleStatusUpdate(item.id, e.target.value, select));

        const reviewLink = document.createElement('a');
        reviewLink.className = 'review-link';
        reviewLink.href = `/admin/neodev/entryform/${item.id}/change/`;
        reviewLink.textContent = 'Full Form →';

        actionGroup.appendChild(select);
        actionGroup.appendChild(reviewLink);
        tdAction.appendChild(actionGroup);

        tr.appendChild(tdApplicant);
        tr.appendChild(tdSchool);
        tr.appendChild(tdTime);
        tr.appendChild(tdStatus);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
    });
}

async function handleStatusUpdate(formId, newStatus, selectEl) {
    selectEl.disabled = true;
    updateStatus(`Status: Updating form #${formId} to ${newStatus}...`, true);

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: formId, status: newStatus })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Re-fetch so stats cards and current filter stay completely in sync
        await fetchDashboardData();
    } catch (err) {
        console.error('Status update failed:', err);
        updateStatus(`Status: Failed to update form #${formId}`, false);
        selectEl.disabled = false;
    }
}

function updateStatus(message, isOk) {
    const statusBar = document.getElementById('status-bar');
    statusBar.textContent = message;
    statusBar.className = 'status-bar ' + (isOk ? 'status-ok' : 'status-err');
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}