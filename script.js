// BarberPro - Versão 2.3 com Lógica de Atendimento Unificada
class BarberPro {
    constructor() {
        this.currentUser = null;
        this.charts = {};
        this.DATA_VERSION = '2.3';
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    init() {
        try {
            this.checkDataVersion();
            this.loadData();
            this.setupEventListeners();
            const token = this.getFromStorage('auth_token', null);
            if (token) {
                this.currentUser = token;
                this.showSection('barberDashboard');
                this.switchDashboardView('dashboardView', true);
                this.loadDashboardData();
                this.checkCaixaStatus(true);
            } else {
                this.showSection('clientArea');
                document.getElementById('clientAreaBtn')?.classList.add('active');
            }
            this.renderClientServices();
            this.renderClientBarbers();
            this.setMinDate();
            const agendaDateFilter = document.getElementById('agendaDateFilter');
            if (agendaDateFilter && !agendaDateFilter.value) {
                const today = new Date();
                const timezoneOffset = today.getTimezoneOffset() * 60000;
                const localDate = new Date(today.getTime() - timezoneOffset);
                agendaDateFilter.value = localDate.toISOString().split('T')[0];
            }
        } catch (error) {
            console.error('Erro durante a inicialização:', error);
            this.showNotification('Ocorreu um erro crítico. Tente limpar os dados do site.', 'error');
        }
    }

    setupEventListeners() {
        const safeAddEventListener = (selector, event, handler) => {
            const element = document.getElementById(selector);
            if (element) element.addEventListener(event, handler);
        };

        const clientAreaBtn = document.getElementById('clientAreaBtn');
        const barberAreaBtn = document.getElementById('barberAreaBtn');
        if (clientAreaBtn && barberAreaBtn) { 
            clientAreaBtn.addEventListener('click', () => { this.showSection('clientArea'); clientAreaBtn.classList.add('active'); barberAreaBtn.classList.remove('active'); });
            barberAreaBtn.addEventListener('click', () => { this.checkAuthentication(); barberAreaBtn.classList.add('active'); clientAreaBtn.classList.remove('active'); });
        }
        
        document.querySelectorAll('.nav-parent').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const parentGroup = button.closest('.nav-group');
                if (!parentGroup) return;
                const submenu = parentGroup.querySelector('.nav-submenu');
                if (!submenu) return;
                const wasOpen = parentGroup.classList.contains('open');
                document.querySelectorAll('.nav-group').forEach(group => {
                    group.classList.remove('open');
                    const sub = group.querySelector('.nav-submenu');
                    if (sub) sub.style.maxHeight = '0';
                });
                if (!wasOpen) {
                    parentGroup.classList.add('open');
                    submenu.style.maxHeight = submenu.scrollHeight + "px";
                }
            });
        });
        
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => { if (!item.classList.contains('nav-parent')) { item.addEventListener('click', (e) => { e.preventDefault(); this.switchDashboardView(item.dataset.view); }); } });
        
        safeAddEventListener('bookingForm', 'submit', e => { e.preventDefault(); this.handleAppointmentSubmit(e.target); });
        safeAddEventListener('loginForm', 'submit', e => { e.preventDefault(); this.handleLoginSubmit(); });
        safeAddEventListener('demoLoginBtn', 'click', () => this.login('barbeiro', '123'));
        safeAddEventListener('logoutBtn', 'click', () => this.logout());
        safeAddEventListener('logoutBtnSidebar', 'click', () => this.logout());
        safeAddEventListener('refreshBtn', 'click', () => { this.loadDashboardData(); this.showNotification('Dados atualizados!'); });
        safeAddEventListener('sidebarToggle', 'click', () => document.querySelector('.dashboard-sidebar')?.classList.toggle('show'));
        safeAddEventListener('clientSearchInput', 'input', () => this.renderFullClientsList());
        safeAddEventListener('resetDataBtn', 'click', () => this.resetTestData());
        safeAddEventListener('agendaDateFilter', 'change', () => this.renderAgendaView());
        safeAddEventListener('prevDayBtn', 'click', () => this.navigateAgendaDays(-1));
        safeAddEventListener('nextDayBtn', 'click', () => this.navigateAgendaDays(1));
        safeAddEventListener('addServiceBtn', 'click', () => this.showServiceModal());
        safeAddEventListener('addProfessionalBtn', 'click', () => this.showProfessionalModal());
        safeAddEventListener('addAppointmentBtn', 'click', () => this.showAppointmentModal(true));
        safeAddEventListener('quickAddAppointmentBtn', 'click', () => this.showAppointmentModal(true));
        safeAddEventListener('addWalkInBtn', 'click', () => this.showAppointmentModal(false));
        safeAddEventListener('openCaixaBtn', 'click', () => this.showAbrirCaixaModal());
        safeAddEventListener('closeCaixaBtn', 'click', () => this.showFecharCaixaModal());
        safeAddEventListener('viewHistoryBtn', 'click', () => this.showCaixaHistoryModal());
        safeAddEventListener('closeModalBtn', 'click', () => this.hideModal());
        safeAddEventListener('modalBackdrop', 'click', e => { if (e.target.id === 'modalBackdrop') this.hideModal(); });

        document.addEventListener('click', e => {
            const action = e.target.closest('[data-action]');
            if (!action) return;
            const id = action.dataset.id;
            switch (action.dataset.action) {
                case 'show-finalize-modal': this.showFinalizeAppointmentModal(id); break;
                case 'cancel-appointment': this.cancelAppointment(id); break;
                case 'edit-service': this.showServiceModal(id); break;
                case 'delete-service': this.deleteService(id); break;
                case 'edit-professional': this.showProfessionalModal(id); break;
                case 'delete-professional': this.deleteProfessional(id); break;
                case 'view-client-details': this.showClientDetailModal(id); break;
            }
        });
    }

    // O restante do arquivo JS
    // (cole o restante do código JS aqui, como providenciado na resposta anterior)
}

window.barberPro = new BarberPro();
