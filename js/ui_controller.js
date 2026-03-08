/**
 * ui_controller.js - Main Controller
 * Coordinates RTOS, ML, and Booking modules.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup UI elements
    const grid = document.getElementById('parking-grid');
    const taskContainer = document.getElementById('rtos-tasks');
    const timeDisplay = document.getElementById('live-time');
    const counterTotal = document.getElementById('counter-total');
    const counterAvail = document.getElementById('counter-available');
    const utilizationBar = document.getElementById('utilization-bar');
    const mlConfidence = document.getElementById('ml-confidence');

    // 2. Define RTOS Tasks
    const captureTask = new RTOS_Task('Frame Capture', 0, 500, 150, async () => {
        // High priority - simulates frame extraction from CCTV
        await new Promise(r => setTimeout(r, 10)); // simulated latency
    });

    const mlInferenceTask = new RTOS_Task('ML Inference', 0, 1000, 200, async () => {
        // High priority - runs detection and updates status
        const detections = ML.detectSlots();
        const bookedInfo = Booking.getCurrentBookedSlots();
        const bookedIds = bookedInfo.map(b => b.slotId);

        detections.forEach(slot => {
            if (bookedIds.includes(slot.id)) {
                slot.status = 'booked';
            }
        });

        // Update Metrics in UI periodically
        const metrics = ML.getMetrics();
        mlConfidence.innerText = metrics.accuracy;
    });

    const uiUpdateTask = new RTOS_Task('UI Render', 2, 800, 150, async () => {
        // Medium priority - refreshes the grid and stats
        renderSlots();
        updateStats();
        updateTaskMetrics();
    });

    const bookingValidationTask = new RTOS_Task('Booking Check', 3, 2000, 100, async () => {
        // Low priority - sanity check for bookings
        Booking.checkExpirations();
    });

    // 3. Register Tasks to RTOS
    RTOS.addTask(captureTask);
    RTOS.addTask(mlInferenceTask);
    RTOS.addTask(uiUpdateTask);
    RTOS.addTask(bookingValidationTask);
    RTOS.start();

    // Initial setup for UI elements that don't need RTOS scheduling
    renderSlots(); // Initial render
    updateStats(); // Initial stats update
    updateTaskMetrics(); // Initial task metrics update

    // 4. UI Rendering Functions
    window.selectSlot = (slotId) => {
        const slot = ML.slots.find(s => s.id === slotId);
        if (!slot) return;

        const now = Date.now();
        const booking = Booking.getSlotBookingInfo(slot.id);
        let isPrebookable = false;

        if (booking) {
            const remainingMs = new Date(booking.endTime).getTime() - now;
            const remainingMins = remainingMs / (60 * 1000);
            if (remainingMins > 0 && remainingMins <= 20) {
                isPrebookable = true;
            }
        }

        if (slot.status === 'available' || isPrebookable) {
            window.selectedSlotId = slot.id;

            // UI Feedback
            document.querySelectorAll('.parkit-selected').forEach(el => el.classList.remove('parkit-selected'));
            const card = document.getElementById(`slot-${slot.id}`);
            if (card) card.classList.add('parkit-selected');

            const cta = document.getElementById('booking-cta');
            const bookBtn = document.getElementById('main-book-btn');

            cta.style.display = 'block';
            cta.classList.add('animate-fade-in');

            const rowChar = slot.label.charAt(0);
            const seatNum = slot.label.substring(1);

            if (isPrebookable) {
                bookBtn.innerHTML = `<div class="flex items-center gap-2"><i class="bi bi-clock-history"></i> <span>SECURE PRE-BOOK</span></div> <div id="selected-slot-label" style="font-size: 0.75rem; opacity: 0.8; font-weight: 400;">Row ${rowChar} - Column ${slot.label}</div>`;
                showNotification(`Slot #${slot.label} expires soon.`, 'info');
            } else {
                bookBtn.innerHTML = `<div class="flex items-center gap-2"><i class="bi bi-calendar-check"></i> <span>SECURE RESERVATION</span></div> <div id="selected-slot-label" style="font-size: 0.75rem; opacity: 0.8; font-weight: 400;">Row ${rowChar} - Column ${slot.label}</div>`;
                showNotification(`Slot #${slot.label} Selected`, 'info');
            }
        } else {
            showNotification(`Slot #${slot.label} is currently unavailable.`, 'error');
        }
    };

    function renderSlots() {
        if (!grid) return;
        const slots = ML.slots;
        const slotsPerRow = 10;

        let html = '';
        for (let i = 0; i < slots.length; i += slotsPerRow) {
            const rowSlots = slots.slice(i, i + slotsPerRow);
            const rowChar = String.fromCharCode(65 + Math.floor(i / slotsPerRow));

            html += `
                <div class="row-layout" style="display: flex; align-items: center; gap: 1.5rem; overflow-x: auto; padding-bottom: 5px;">
                    <div style="font-weight: 800; color: var(--text-dim); min-width: 65px; font-size: 0.85rem; letter-spacing: 1px;">ROW ${rowChar}</div>
                    <div style="display: flex; gap: 0.75rem;">
                        ${rowSlots.map(slot => {
                const isSelected = window.selectedSlotId === slot.id;
                const color = slot.status === 'available' ? 'var(--success)' : (slot.status === 'occupied' ? 'var(--accent)' : 'var(--warning)');
                const bg = slot.status === 'available' ? '#fff' : (slot.status === 'occupied' ? 'rgba(244, 63, 94, 0.05)' : 'rgba(245, 158, 11, 0.05)');

                return `
                                <div class="seat-node ${isSelected ? 'parkit-selected' : ''}" 
                                     id="slot-${slot.id}"
                                     style="width: 50px; height: 60px; border-radius: 10px; border: 1px solid var(--glass-border); 
                                            display: flex; flex-direction: column; align-items: center; justify-content: center; 
                                            cursor: pointer; position: relative; transition: all 0.2s; background: ${bg};"
                                     onclick="window.selectSlot(${slot.id})">
                                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-main);">${slot.label}</div>
                                    <div style="width: 6px; height: 6px; border-radius: 50%; background: ${color}; margin-top: 6px; box-shadow: 0 0 8px ${color};"></div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        }
        grid.innerHTML = html;
    }

    function updateStats() {
        const available = ML.slots.filter(s => s.status === 'available').length;
        const total = ML.slots.length;
        const utilization = Math.round(((total - available) / total) * 100);

        counterTotal.innerText = total;
        counterAvail.innerText = available;
        utilizationBar.style.width = `${utilization}%`;

        const label = document.getElementById('utilization-label');
        if (label) label.innerText = `${utilization}%`;
    }

    function updateTaskMetrics() {
        if (!taskContainer) return;
        const m = RTOS.getMetrics();

        taskContainer.innerHTML = m.map(task => `
            <div class="glass-card" style="padding: 1rem; border-left: 3px solid ${task.misses > 0 ? 'var(--accent)' : 'var(--success)'};">
                <div class="flex justify-between items-center mb-2">
                    <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); letter-spacing: 1px;">${task.name.toUpperCase()}</span>
                    <span style="font-size: 0.6rem; color: ${task.misses > 0 ? 'var(--accent)' : 'var(--success)'}; font-weight: 800;">
                        ${task.priority === 0 ? 'CRITICAL' : 'NORMAL'}
                    </span>
                </div>
                <div class="flex justify-between" style="font-size: 0.8rem; margin-bottom: 2px;">
                    <span style="color: var(--text-dim);">Latency</span>
                    <span style="font-weight: 600; color: var(--text-main);">${task.latency}ms</span>
                </div>
                <div class="flex justify-between" style="font-size: 0.8rem; margin-bottom: 2px;">
                   <span style="color: var(--text-dim);">Jitter</span>
                   <span style="color: var(--primary-light);">${task.jitter}ms</span>
                </div>
            </div>
        `).join('');
    }

    // 5. Booking Handler
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.onsubmit = (e) => {
            e.preventDefault();

            const time = document.getElementById('start-time').value;
            const duration = document.getElementById('duration').value;
            const vehicleId = document.getElementById('vehicle-id').value;

            // Auto-select first available slot for simplicity in this demo, 
            // but normally user would pick a slot
            const availSlot = ML.slots.find(s => s.status === 'available');

            if (availSlot) {
                Booking.book(availSlot.id, time, duration, vehicleId);
                showNotification(`Reservation Confirmed for Slot #${availSlot.label}`);
                bookingForm.reset();
            } else {
                showNotification(`No slots available!`, 'error');
            }
        };
    }

    // 6. Utility Functions
    window.showNotification = (text, type = 'success') => {
        const notif = document.getElementById('notification');
        const notifText = document.getElementById('notif-text');

        notifText.innerText = text;
        notif.style.display = 'block';
        notif.style.borderLeftColor = type === 'success' ? 'var(--accent-emerald)' : (type === 'error' ? 'var(--accent-rose)' : 'var(--secondary)');

        setTimeout(() => {
            notif.style.display = 'none';
        }, 3000);
    };

    // Live Clock
    setInterval(() => {
        const now = new Date();
        timeDisplay.innerText = now.toTimeString().split(' ')[0];
    }, 1000);
    // 7. Booking Tab Toggle
    window.toggleBooking = (show) => {
        const cta = document.getElementById('booking-cta');
        const card = document.getElementById('booking-card');
        if (show) {
            cta.style.display = 'none';
            card.style.display = 'block';
            card.classList.add('animate-fade-in');
        } else {
            cta.style.display = 'block';
            card.style.display = 'none';
        }
    };

    window.showParkingGrid = () => {
        document.getElementById('hero-screen').style.display = 'none';
        const dashboard = document.getElementById('main-dashboard');
        dashboard.style.display = 'grid';
        dashboard.classList.add('animate-fade-in');
    };

    window.goBackToHero = () => {
        document.getElementById('main-dashboard').style.display = 'none';
        const hero = document.getElementById('hero-screen');
        hero.style.display = 'flex';
        hero.classList.add('animate-fade-in');

        // Reset selection state
        document.getElementById('booking-cta').style.display = 'none';
        document.getElementById('booking-card').style.display = 'none';
        document.querySelectorAll('.parkit-selected').forEach(el => el.classList.remove('parkit-selected'));
    };

    window.toggleSidebar = (show) => {
        const sidebar = document.getElementById('profile-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (show) {
            sidebar.style.right = '0';
            overlay.style.display = 'block';
        } else {
            sidebar.style.right = '-350px';
            overlay.style.display = 'none';
        }
    };

    // 8. Auth Portal Logic
    window.switchAuthTab = (tab) => {
        const loginTab = document.getElementById('tab-login');
        const signupTab = document.getElementById('tab-signup');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');

        if (tab === 'login') {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            loginTab.classList.remove('active');
            signupTab.classList.add('active');
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        }
    };

    window.handleAuth = (mode) => {
        const loginEmailInput = document.getElementById('login-email');
        const signupEmailInput = document.getElementById('signup-email');
        const email = mode === 'login' ? loginEmailInput?.value : signupEmailInput?.value;

        const authBtn = event.currentTarget;
        const originalText = authBtn.innerText;

        authBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin"></i> Processing...';
        authBtn.style.pointerEvents = 'none';
        authBtn.style.opacity = '0.7';

        setTimeout(() => {
            // Restore button state
            authBtn.innerHTML = originalText;
            authBtn.style.pointerEvents = 'all';
            authBtn.style.opacity = '1';

            if (mode === 'signup') {
                // For signup, switch to login tab
                window.switchAuthTab('login');
                window.showNotification(`Account created! Please login to continue.`, 'success');

                // Pre-fill email in login form if available
                if (email && loginEmailInput) loginEmailInput.value = email;
            } else {
                // For login, close modal and show hero screen
                document.getElementById('auth-modal').style.display = 'none';
                window.showNotification(`Welcome back to PARKIT!`, 'success');

                // Ensure hero screen is visible
                document.getElementById('hero-screen').style.display = 'flex';
                document.getElementById('main-dashboard').style.display = 'none';

                // Update sidebar info
                const sidebarName = document.querySelector('#profile-sidebar h2');
                if (sidebarName && email) {
                    sidebarName.innerText = email.split('@')[0];
                }
            }
        }, 1200);
    };

    window.togglePassVisibility = (id, icon) => {
        const input = document.getElementById(id);
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('bi-eye-slash', 'bi-eye');
        }
    };

    window.handleLogout = () => {
        // Show auth modal and hide other screens
        document.getElementById('auth-modal').style.display = 'flex';
        document.getElementById('hero-screen').style.display = 'none';
        document.getElementById('main-dashboard').style.display = 'none';

        // Close sidebars
        window.toggleSidebar(false);
        window.toggleBookingsView(false);

        // Reset forms
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        if (loginForm) loginForm.querySelector('form')?.reset();
        if (signupForm) signupForm.querySelector('form')?.reset();

        showNotification('Logged out successfully', 'info');
    };

    // Profile Management
    window.toggleProfileModal = (show) => {
        const overlay = document.getElementById('profile-modal-overlay');
        overlay.style.display = show ? 'flex' : 'none';
        if (show) {
            // Load current data
            const user = JSON.parse(localStorage.getItem('parkit_user')) || {};
            document.getElementById('profile-name').value = user.name || '';
            document.getElementById('profile-phone').value = user.phone || '';
            document.getElementById('profile-vehicle').value = user.vehicle || '';
        }
    };

    window.saveProfile = () => {
        const name = document.getElementById('profile-name').value;
        const phone = document.getElementById('profile-phone').value;
        const vehicle = document.getElementById('profile-vehicle').value;

        const userData = { name, phone, vehicle };
        localStorage.setItem('parkit_user', JSON.stringify(userData));

        // Update sidebar
        const sidebarName = document.querySelector('#profile-sidebar h2');
        if (sidebarName && name) sidebarName.innerText = name;

        window.toggleProfileModal(false);
        window.showNotification('Profile updated successfully!', 'success');
    };

    // Bookings View
    window.toggleBookingsView = (show) => {
        const view = document.getElementById('bookings-view');
        view.style.right = show ? '0' : '-400px';
        if (show) {
            renderBookingTickets();
        }
    };

    function renderBookingTickets() {
        const list = document.getElementById('bookings-list');
        const bookings = Booking.bookings || [];

        if (bookings.length === 0) {
            document.getElementById('no-bookings-msg').style.display = 'block';
            // Clear previous tickets
            const tickets = list.querySelectorAll('.booking-ticket');
            tickets.forEach(t => t.remove());
            return;
        }

        document.getElementById('no-bookings-msg').style.display = 'none';
        // Clear and rebuild
        const tickets = list.querySelectorAll('.booking-ticket');
        tickets.forEach(t => t.remove());

        bookings.forEach(booking => {
            const ticket = document.createElement('div');
            ticket.className = 'booking-ticket animate-fade-in';
            const startTime = new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(booking.startTime).toLocaleDateString();

            ticket.innerHTML = `
                <div class="ticket-header">
                    <span style="font-weight: 800; color: var(--primary);">#${booking.id}</span>
                    <span class="badge badge-booked">ACTIVE</span>
                </div>
                <div class="ticket-row">
                    <span class="ticket-label">SLOT</span>
                    <span class="ticket-value">${booking.slotId}</span>
                </div>
                <div class="ticket-row">
                    <span class="ticket-label">DATE</span>
                    <span class="ticket-value">${date}</span>
                </div>
                <div class="ticket-row">
                    <span class="ticket-label">START</span>
                    <span class="ticket-value">${startTime}</span>
                </div>
                <div class="ticket-row">
                    <span class="ticket-label">VEHICLE</span>
                    <span class="ticket-value">${booking.vehicleId}</span>
                </div>
            `;
            list.appendChild(ticket);
        });
    }

});
