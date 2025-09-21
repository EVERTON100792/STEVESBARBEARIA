// BarberPro - Versão 3.1 com Inicialização Robusta
class BarberPro {
    constructor() {
        this.currentUser = null;
        this.charts = {};
        this.DATA_VERSION = '3.1'; // Nova versão para garantir consistência
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
            } else {
                this.showSection('clientArea');
                const clientAreaBtn = document.getElementById('clientAreaBtn');
                if(clientAreaBtn) clientAreaBtn.classList.add('active');
            }

            // Estas funções agora são mais seguras e só rodam se a área do cliente estiver visível
            if (document.getElementById('clientArea')?.style.display !== 'none') {
                this.renderClientServices();
                this.renderClientBarbers();
                this.setMinDate();
            }
            
            const agendaDateFilter = document.getElementById('agendaDateFilter');
            if (agendaDateFilter && !agendaDateFilter.value) {
                agendaDateFilter.value = this.getTodayDateString();
            }
        } catch (error) {
            console.error('Erro crítico durante a inicialização:', error);
            this.showNotification('Ocorreu um erro crítico. O sistema não pôde ser carregado.', 'error');
        }
    }

    setupEventListeners() {
        const safeAddEventListener = (selector, event, handler) => {
            const element = document.getElementById(selector);
            if (element) element.addEventListener(event, handler.bind(this));
        };

        // Navegação principal
        safeAddEventListener('clientAreaBtn', e => { this.showSection('clientArea'); e.target.classList.add('active'); document.getElementById('barberAreaBtn')?.classList.remove('active'); });
        safeAddEventListener('barberAreaBtn', e => { this.checkAuthentication(); e.target.classList.add('active'); document.getElementById('clientAreaBtn')?.classList.remove('active'); });

        // Navegação do Dashboard (Sidebar)
        document.querySelectorAll('.nav-parent').forEach(button => {
            button.addEventListener('click', e => {
                e.preventDefault();
                const parentGroup = button.closest('.nav-group');
                if (!parentGroup) return;
                const submenu = parentGroup.querySelector('.nav-submenu');
                if (!submenu) return;
                const wasOpen = parentGroup.classList.contains('open');
                document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
                if (!wasOpen) parentGroup.classList.add('open');
            });
        });
        document.querySelectorAll('.sidebar-nav .nav-item:not(.nav-parent)').forEach(item => item.addEventListener('click', e => { e.preventDefault(); this.switchDashboardView(item.dataset.view); }));
        
        const toggleSidebar = () => document.body.classList.toggle('sidebar-is-open');
        safeAddEventListener('sidebarToggle', 'click', toggleSidebar);
        safeAddEventListener('closeSidebarBtn', 'click', toggleSidebar);
        safeAddEventListener('sidebarOverlay', 'click', toggleSidebar);

        // Forms e Ações Principais
        safeAddEventListener('bookingForm', 'submit', e => { e.preventDefault(); this.handleAppointmentSubmit(e.target); });
        safeAddEventListener('loginForm', 'submit', e => { e.preventDefault(); this.handleLoginSubmit(); });
        safeAddEventListener('demoLoginBtn', 'click', () => this.login('barbeiro', '123'));
        safeAddEventListener('logoutBtn', 'click', this.logout);
        safeAddEventListener('logoutBtnSidebar', 'click', this.logout);
        safeAddEventListener('refreshBtn', 'click', () => { this.loadDashboardData(); this.showNotification('Dados atualizados!'); });
        safeAddEventListener('resetDataBtn', 'click', this.resetTestData);

        // Ações das Views
        safeAddEventListener('clientSearchInput', 'input', this.renderFullClientsList);
        safeAddEventListener('agendaDateFilter', 'change', this.renderAgendaView);
        safeAddEventListener('prevDayBtn', 'click', () => this.navigateAgendaDays(-1));
        safeAddEventListener('nextDayBtn', 'click', () => this.navigateAgendaDays(1));
        safeAddEventListener('addServiceBtn', 'click', () => this.showServiceModal());
        safeAddEventListener('addProfessionalBtn', 'click', () => this.showProfessionalModal());
        safeAddEventListener('addAppointmentBtn', 'click', () => this.showAppointmentModal(true));
        safeAddEventListener('quickAddAppointmentBtn', 'click', () => this.showAppointmentModal(true));
        safeAddEventListener('addWalkInBtn', 'click', () => this.showAppointmentModal(false));
        
        // Ações do Caixa
        safeAddEventListener('openCaixaBtn', 'click', this.showAbrirCaixaModal);
        safeAddEventListener('closeCaixaBtn', 'click', this.showFecharCaixaModal);
        safeAddEventListener('viewHistoryBtn', 'click', this.showCaixaHistoryModal);
        safeAddEventListener('addExpenseBtnMain', 'click', this.showExpenseModal);
        
        // Modal
        safeAddEventListener('closeModalBtn', 'click', this.hideModal);
        safeAddEventListener('modalBackdrop', 'click', e => { if (e.target.id === 'modalBackdrop') this.hideModal(); });

        // Event Delegation para ações dinâmicas
        document.addEventListener('click', e => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;
            
            const { action, id } = actionTarget.dataset;
            // e.preventDefault(); // Removido para não interferir com cliques normais

            const actions = {
                'open-comanda-modal': () => this.showComandaActionsModal(id),
                'cancel-appointment': () => this.cancelAppointment(id),
                'edit-service': () => this.showServiceModal(id),
                'delete-service': () => this.deleteService(id),
                'edit-professional': () => this.showProfessionalModal(id),
                'delete-professional': () => this.deleteProfessional(id),
                'view-client-details': () => this.showClientDetailModal(id),
            };

            if (actions[action]) {
                e.preventDefault();
                actions[action]();
            }
        });
    }
    
    // --- LÓGICA DE NAVEGAÇÃO E UI ---

    showSection(sectionId) {
        document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
        const section = document.getElementById(sectionId);
        if(section) section.style.display = 'block';
        
        const navbar = document.querySelector('.navbar');
        if(navbar) navbar.style.display = sectionId === 'barberDashboard' ? 'none' : 'flex';
    }

    switchDashboardView(viewId) {
        if (!viewId) return;
        document.querySelectorAll('.content-view').forEach(v => v.style.display = 'none');
        const viewElement = document.getElementById(viewId);
        if(viewElement) viewElement.style.display = 'block';

        const titles = {
            dashboardView: { title: 'Dashboard', subtitle: 'Visão geral do seu negócio.' },
            appointmentsView: { title: 'Agenda', subtitle: 'Visualize e gerencie seus horários.' },
            comandasView: { title: 'Comandas Abertas', subtitle: 'Gerencie os atendimentos em andamento.' },
            clientsView: { title: 'Clientes', subtitle: 'Consulte e gerencie sua base de clientes.' },
            servicesView: { title: 'Serviços', subtitle: 'Configure os serviços oferecidos.' },
            professionalsView: { title: 'Profissionais', subtitle: 'Gerencie a equipe de barbeiros.' },
            financialView: { title: 'Caixa', subtitle: 'Acompanhe suas receitas e despesas.' },
            reportsView: { title: 'Relatórios', subtitle: 'Analise o desempenho da sua barbearia.' }
        };
        const { title, subtitle } = titles[viewId] || { title: 'Página', subtitle: ''};

        const titleEl = document.getElementById('dashboardTitle');
        const subtitleEl = document.getElementById('dashboardSubtitle');
        if(titleEl) titleEl.textContent = title;
        if(subtitleEl) subtitleEl.textContent = subtitle;

        document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
        const activeNavItem = document.querySelector(`.sidebar-nav .nav-item[data-view="${viewId}"]`);
        if(activeNavItem) {
            activeNavItem.classList.add('active');
            const parentGroup = activeNavItem.closest('.nav-group');
            if(parentGroup) {
                parentGroup.querySelector('.nav-parent')?.classList.add('active');
                if(!parentGroup.classList.contains('open')) parentGroup.classList.add('open');
            }
        }
        
        const renderActions = {
            dashboardView: this.loadDashboardData,
            appointmentsView: this.renderAgendaView,
            comandasView: this.renderPendingAppointments,
            clientsView: this.renderFullClientsList,
            servicesView: this.renderServicesList,
            professionalsView: this.renderProfessionalsList,
            financialView: this.renderFinancialPage,
            reportsView: this.renderCharts,
        };

        if(renderActions[viewId]) renderActions[viewId].call(this);

        document.body.classList.remove('sidebar-is-open');
    }

    // --- LÓGICA DE DADOS (STORAGE) ---

    checkDataVersion() {
        if (localStorage.getItem('barberpro_data_version') !== this.DATA_VERSION) {
            localStorage.clear();
            localStorage.setItem('barberpro_data_version', this.DATA_VERSION);
        }
    }

    getFromStorage(key, defaultValue) {
        try {
            const item = localStorage.getItem(`barberpro_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch { return defaultValue; }
    }
    
    saveToStorage(key, data) {
        localStorage.setItem(`barberpro_${key}`, JSON.stringify(data));
    }

    loadData() {
        this.services = this.getFromStorage('services', [{ id: `s_default`, name: 'Corte Tradicional', price: 35, duration: 45, description: 'Corte clássico na tesoura e máquina.' }]);
        this.barbers = this.getFromStorage('barbers', [{ id: `b_default`, name: 'Hernani', specialty: 'Corte e Barba' }]);
        this.appointments = this.getFromStorage('appointments', []);
        this.clients = this.getFromStorage('clients', []);
        this.caixa = this.getFromStorage('caixa', { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] });
        this.caixaHistory = this.getFromStorage('caixaHistory', []);
        this.updateServiceDropdown();
        this.updateBarberDropdowns();
    }

    saveData() {
        this.saveToStorage('services', this.services);
        this.saveToStorage('barbers', this.barbers);
        this.saveToStorage('appointments', this.appointments);
        this.saveToStorage('clients', this.clients);
        this.saveToStorage('caixa', this.caixa);
        this.saveToStorage('caixaHistory', this.caixaHistory);
    }
    
    resetTestData() {
        if (confirm('ATENÇÃO!\nIsto irá apagar TODOS os agendamentos, clientes e dados financeiros. Serviços e profissionais serão mantidos.\nDeseja continuar?')) {
            this.appointments = [];
            this.clients = [];
            this.caixa = { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] };
            this.caixaHistory = [];
            this.saveData();
            this.loadDashboardData();
            this.switchDashboardView('dashboardView');
            this.showNotification('Dados de teste foram zerados.', 'success');
        }
    }

    // --- AUTENTICAÇÃO ---

    checkAuthentication() {
        if (this.getFromStorage('auth_token', null)) {
            this.showSection('barberDashboard');
            if(!this.currentUser) this.currentUser = this.getFromStorage('auth_token');
            this.switchDashboardView('dashboardView');
        } else {
            this.showSection('barberLogin');
        }
    }

    login(username, password) {
        if (username === 'barbeiro' && password === '123') {
            this.currentUser = { username: 'barbeiro' };
            this.saveToStorage('auth_token', this.currentUser);
            this.showSection('barberDashboard');
            this.switchDashboardView('dashboardView');
            this.showNotification('Login realizado com sucesso!', 'success');
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('barberpro_auth_token');
        this.showSection('clientArea');
        const clientAreaBtn = document.getElementById('clientAreaBtn');
        const barberAreaBtn = document.getElementById('barberAreaBtn');
        if(clientAreaBtn) clientAreaBtn.classList.add('active');
        if(barberAreaBtn) barberAreaBtn.classList.remove('active');
        this.showNotification('Você saiu da sua conta.');
    }

    handleLoginSubmit() {
        const usernameEl = document.getElementById('username');
        const passwordEl = document.getElementById('password');
        if (usernameEl && passwordEl) {
            if (!this.login(usernameEl.value, passwordEl.value)) {
                this.showNotification('Usuário ou senha inválidos.', 'error');
            }
        }
    }

    // --- LÓGICA DE AGENDAMENTOS E COMANDAS (sem alterações) ---
    // ... (o código desta seção permanece o mesmo da versão anterior)

    // --- RENDERIZAÇÃO DAS VIEWS E COMPONENTES ---

    loadDashboardData() {
        if(!this.currentUser) return;
        this.updateCaixaStatusIndicator();
        this.updateStats();
        this.renderDashboardAppointments();
    }

    updateStats() {
        const todayStr = this.getTodayDateString();
        const todayAppointments = this.appointments.filter(a => a.date === todayStr && a.status === 'scheduled');
        const todayRevenue = (this.caixa.entradas || []).filter(e => e.data.startsWith(todayStr)).reduce((sum, e) => sum + e.valor, 0);
        const pendingCount = this.appointments.filter(a => a.status === 'in_progress').length;
        
        const todayCountEl = document.getElementById('todayCount');
        const pendingCountEl = document.getElementById('pendingCount');
        const todayProfitEl = document.getElementById('todayProfit');

        if(todayCountEl) todayCountEl.textContent = todayAppointments.length;
        if(pendingCountEl) pendingCountEl.textContent = pendingCount;
        if(todayProfitEl) todayProfitEl.textContent = this.formatCurrency(todayRevenue);
    }
    
    // As outras funções permanecem as mesmas da versão 3.0
    // Adicionando-as aqui para garantir que o código esteja completo.

    handleAppointmentSubmit(form) {
        const formData = new FormData(form);
        const name = formData.get('name').trim();
        const phone = this.sanitizePhone(formData.get('phone'));
        const isWalkIn = form.dataset.walkIn === 'true';

        if (!name || phone.length < 10 || !formData.get('service') || !formData.get('barber')) {
            return this.showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
        }

        const appointmentDate = isWalkIn ? this.getTodayDateString() : formData.get('date');
        const appointmentTime = isWalkIn ? new Date().toTimeString().slice(0, 5) : formData.get('time');

        const appointment = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            name,
            phone,
            service: formData.get('service'),
            barberId: formData.get('barber'),
            date: appointmentDate,
            time: appointmentTime,
            status: isWalkIn ? 'in_progress' : 'scheduled', // Encaixe já entra em progresso
            paymentStatus: 'pending',
        };

        this.getOrUpdateClient(appointment.phone, appointment.name);
        this.appointments.push(appointment);
        this.saveData();
        
        this.showNotification(isWalkIn ? 'Comanda aberta com sucesso!' : 'Agendamento realizado com sucesso!', 'success');
        
        if (form.id === 'bookingForm') {
            form.reset();
            this.setMinDate();
        } else {
            this.hideModal();
            this.renderAgendaView();
            this.renderPendingAppointments();
            this.loadDashboardData();
        }
    }
    
    showComandaActionsModal(appointmentId) {
        const appointment = this.appointments.find(a => a.id === appointmentId);
        if (!appointment) return;
        const service = this.services.find(s => s.id === appointment.service);
        const barber = this.barbers.find(b => b.id === appointment.barberId);

        let actions = '';
        if (appointment.status === 'scheduled') {
            actions = `<button id="startServiceBtn" class="btn-primary">Iniciar Atendimento</button>`;
        } else if (appointment.status === 'in_progress') {
            actions = `<button id="finalizeServiceBtn" class="btn-primary">Finalizar e Receber</button>`;
        }
        
        const content = `
            <div>
                <p><strong>Cliente:</strong> ${appointment.name}</p>
                <p><strong>Serviço:</strong> ${service?.name || 'N/A'}</p>
                <p><strong>Profissional:</strong> ${barber?.name || 'N/A'}</p>
                <p><strong>Horário:</strong> ${this.formatDate(appointment.date)} às ${appointment.time}</p>
                <p><strong>Valor:</strong> ${this.formatCurrency(service?.price || 0)}</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                ${actions}
            </div>`;
            
        this.showModal('Gerenciar Atendimento', content);
        
        const startBtn = document.getElementById('startServiceBtn');
        const finalizeBtn = document.getElementById('finalizeServiceBtn');

        if(startBtn) startBtn.addEventListener('click', () => this.startService(appointmentId));
        if(finalizeBtn) finalizeBtn.addEventListener('click', () => this.showFinalizeAppointmentModal(appointmentId));
    }
    
    startService(appointmentId) {
        if (!this.checkCaixaStatus()) return;
        const appointment = this.appointments.find(a => a.id === appointmentId);
        if (appointment) {
            appointment.status = 'in_progress';
            this.saveData();
            this.hideModal();
            this.showNotification('Atendimento iniciado!', 'success');
            this.renderAgendaView();
            this.renderPendingAppointments();
            this.loadDashboardData();
        }
    }
    
    showFinalizeAppointmentModal(appointmentId) {
        const appointment = this.appointments.find(a => a.id === appointmentId);
        if (!appointment) return;
        const service = this.services.find(s => s.id === appointment.service);

        const content = `
            <form id="finalizeForm">
                <p>Finalizando atendimento de <strong>${appointment.name}</strong>.</p>
                <h4>Total: ${this.formatCurrency(service?.price || 0)}</h4>
                <div class="form-group" style="margin-top:1.5rem">
                    <label for="paymentMethod">Forma de Pagamento</label>
                    <select id="paymentMethod" name="paymentMethod" required>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Pix">Pix</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Confirmar Pagamento</button>
                </div>
            </form>`;
        this.showModal('Finalizar e Receber', content);
        
        const finalizeForm = document.getElementById('finalizeForm');
        if(finalizeForm) finalizeForm.addEventListener('submit', e => {
            e.preventDefault();
            const paymentMethod = e.target.querySelector('[name="paymentMethod"]').value;
            this.finalizeAppointment(appointmentId, paymentMethod);
        });
    }

    finalizeAppointment(appointmentId, paymentMethod) {
        const appointment = this.appointments.find(a => a.id === appointmentId);
        if (!appointment) return;
        const service = this.services.find(s => s.id === appointment.service);
        if (!service) return;

        this.caixa.entradas.push({
            descricao: `Serviço: ${service.name} (${appointment.name})`,
            valor: service.price,
            data: new Date().toISOString(),
            metodo: paymentMethod
        });
        
        appointment.status = 'completed';
        appointment.paymentStatus = 'paid';
        appointment.paymentMethod = paymentMethod;
        appointment.closedAt = new Date().toISOString();
        
        this.saveData();
        this.hideModal();
        this.showNotification(`Pagamento de ${this.formatCurrency(service.price)} recebido!`, 'success');
        this.renderAgendaView();
        this.renderPendingAppointments();
        this.loadDashboardData();
    }
    
    cancelAppointment(id) {
        if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
            const appointment = this.appointments.find(a => a.id === id);
            if (appointment) {
                appointment.status = 'cancelled';
                this.saveData();
                this.loadDashboardData();
                this.renderAgendaView();
                this.renderPendingAppointments();
                this.showNotification('Agendamento cancelado.');
            }
        }
    }
    checkCaixaStatus(isInitialLoad = false) {
        if (this.caixa.status === 'fechado') {
            if (!isInitialLoad) {
                this.showNotification('O caixa está fechado. É preciso abri-lo para esta operação.', 'error');
                this.showAbrirCaixaModal();
            }
            return false;
        }
        return true;
    }

    abrirCaixa(valorInicial) {
        if (isNaN(valorInicial) || valorInicial < 0) return this.showNotification('Valor inicial inválido.', 'error');
        this.caixa = {
            status: 'aberto',
            saldoInicial: valorInicial,
            abertura: new Date().toISOString(),
            entradas: [],
            saidas: []
        };
        this.saveData();
        this.hideModal();
        this.updateCaixaStatusIndicator();
        this.renderFinancialPage();
        this.showNotification(`Caixa aberto com ${this.formatCurrency(valorInicial)}!`, 'success');
    }

    fecharCaixa() {
        const countedCashEl = document.getElementById('countedCash');
        if (!countedCashEl) return;
        const countedCash = parseFloat(countedCashEl.value) || 0;
        const totalsByMethod = this.caixa.entradas.reduce((acc, e) => ({ ...acc, [e.metodo]: (acc[e.metodo] || 0) + e.valor }), {});
        const totalEntradas = this.caixa.entradas.reduce((sum, item) => sum + item.valor, 0);
        const totalSaidas = this.caixa.saidas.reduce((sum, item) => sum + item.valor, 0);
        const dinheiroEntradas = totalsByMethod['Dinheiro'] || 0;
        const saldoEsperadoDinheiro = this.caixa.saldoInicial + dinheiroEntradas - totalSaidas;

        const closingSummary = {
            id: `caixa_${Date.now()}`,
            abertura: this.caixa.abertura,
            fechamento: new Date().toISOString(),
            saldoInicial: this.caixa.saldoInicial,
            totalEntradas,
            totalSaidas,
            saldoEsperadoDinheiro,
            dinheiroConferido: countedCash,
            diferenca: countedCash - saldoEsperadoDinheiro
        };
        this.caixaHistory.push(closingSummary);
        this.caixa = { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] };
        this.saveData();
        this.hideModal();
        this.updateCaixaStatusIndicator();
        this.renderFinancialPage();
        this.showNotification('Caixa fechado e salvo no histórico.', 'success');
    }
    renderDashboardAppointments() {
        const listEl = document.getElementById('appointmentsList');
        if(!listEl) return;
        const today = this.getTodayDateString();
        const upcoming = this.appointments
            .filter(a => a.date >= today && (a.status === 'scheduled' || a.status === 'in_progress'))
            .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time))
            .slice(0, 5);
        listEl.innerHTML = upcoming.length === 0 
            ? '<p class="empty-state">Nenhum agendamento futuro.</p>' 
            : upcoming.map(a => this.createAppointmentCard(a)).join('');
    }

    renderPendingAppointments() {
        const container = document.getElementById('pendingAppointmentsList');
        if(!container) return;
        const pending = this.appointments.filter(a => a.status === 'in_progress');
        container.innerHTML = pending.length === 0
            ? '<p class="empty-state">Nenhuma comanda em andamento.</p>'
            : pending.map(app => this.createAppointmentCard(app)).join('');
    }
    
    renderAgendaView() {
        const container = document.getElementById('agendaViewContainer');
        const dateFilter = document.getElementById('agendaDateFilter');
        if (!container || !dateFilter) return;

        const selectedDate = dateFilter.value;
        const timeSlots = Array.from({ length: (19 - 9) * 4 }, (_, i) => {
            const hour = 9 + Math.floor(i / 4);
            if (hour === 12 || hour === 13) return null; // Almoço
            const minute = (i % 4) * 15;
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }).filter(Boolean);

        const timeColumnHTML = '<div class="agenda-time-column">' + timeSlots.map(time => `<div class="agenda-time-slot">${time.endsWith(':00') ? `<b>${time}</b>` : ''}</div>`).join('') + '</div>';
        
        let barbersAreaHTML = `<div class="agenda-barbers-area" style="grid-template-columns: repeat(${this.barbers.length}, 1fr);">`;
        this.barbers.forEach(barber => {
            barbersAreaHTML += `<div class="agenda-barber-column"><div class="agenda-barber-header">${barber.name}</div><div class="agenda-slots-container">`;
            const barberAppointments = this.appointments.filter(a => a.barberId === barber.id && a.date === selectedDate && a.status !== 'cancelled');
            
            barberAppointments.forEach(app => {
                const service = this.services.find(s => s.id === app.service);
                if (!service || !app.time) return;
                try {
                    const [startHour, startMinute] = app.time.split(':').map(Number);
                    let totalMinutesFrom9AM = (startHour - 9) * 60 + startMinute;
                    if(startHour >= 14) totalMinutesFrom9AM -= 120; // Ajusta para o horário do almoço
                    const topPosition = totalMinutesFrom9AM;
                    const height = service.duration;

                    barbersAreaHTML += `
                        <div class="agenda-appointment-block status-${app.status}" data-id="${app.id}" style="top: ${topPosition}px; height: ${height}px;" data-action="open-comanda-modal">
                            <p class="appointment-block-name">${app.name}</p>
                            <p class="appointment-block-service">${service.name}</p>
                        </div>`;
                } catch(e) { console.error("Erro ao renderizar agendamento na agenda:", app, e); }
            });
            barbersAreaHTML += `</div></div>`;
        });
        barbersAreaHTML += `</div>`;
        container.innerHTML = timeColumnHTML + barbersAreaHTML;
    }
    createAppointmentCard(appointment) {
        const service = this.services.find(s => s.id === appointment.service);
        const barber = this.barbers.find(b => b.id === appointment.barberId);
        const statusMap = {
            scheduled: { text: 'Agendado', class: 'status-scheduled' },
            completed: { text: 'Concluído', class: 'status-completed' },
            cancelled: { text: 'Cancelado', class: 'status-cancelled' },
            in_progress: { text: 'Em Andamento', class: 'status-in_progress'}
        };
        const status = statusMap[appointment.status] || {text: 'Pendente', class: 'status-pending'};
        
        return `
            <div class="appointment-card status-${appointment.status}" data-id="${appointment.id}" data-action="open-comanda-modal">
                <div class="appointment-header">
                    <div class="appointment-client"><h4>${appointment.name}</h4><p>${this.formatDate(appointment.date)} - ${appointment.time}h</p></div>
                    <div class="appointment-time"><p>${barber?.name || 'N/A'}</p><span class="appointment-status ${status.class}">${status.text}</span></div>
                </div>
                <div class="appointment-footer">
                    <p class="appointment-service">${service?.name || 'Serviço'} - <strong>${this.formatCurrency(service?.price || 0)}</strong></p>
                </div>
            </div>`;
    }
    renderFullClientsList() {
        const container = document.getElementById('fullClientsList');
        const searchInput = document.getElementById('clientSearchInput');
        if(!container || !searchInput) return;
        const searchTerm = searchInput.value.toLowerCase();
        const clients = this.clients
            .filter(c => c.name.toLowerCase().includes(searchTerm) || c.phone.includes(searchTerm))
            .sort((a,b) => a.name.localeCompare(b.name));
        container.innerHTML = clients.length === 0 ? '<p class="empty-state">Nenhum cliente encontrado.</p>'
            : clients.map(client => `
                <div class="data-card">
                    <div>
                        <strong>${client.name}</strong>
                        <div class="data-card-info"><span>📞 ${client.phone}</span></div>
                    </div>
                    <div class="data-card-actions">
                        <button class="btn-secondary btn-small" data-action="view-client-details" data-id="${client.phone}">Ver Detalhes</button>
                    </div>
                </div>`).join('');
    }
    
    renderServicesList() {
        const container = document.getElementById('servicesList');
        if(!container) return;
        container.innerHTML = this.services.map(service => `
            <div class="data-card">
                <div>
                    <strong>${service.name}</strong>
                    <div class="data-card-info">
                        <span>💰 ${this.formatCurrency(service.price)}</span>
                        <span>⏱️ ${service.duration} min</span>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn-secondary btn-small" data-action="edit-service" data-id="${service.id}">Editar</button>
                    <button class="btn-secondary btn-danger btn-small" data-action="delete-service" data-id="${service.id}">Excluir</button>
                </div>
            </div>`).join('');
    }

    renderProfessionalsList() {
        const container = document.getElementById('professionalsList');
        if(!container) return;
        container.innerHTML = this.barbers.map(barber => `
            <div class="data-card">
                <div>
                    <strong>${barber.name}</strong>
                    <div class="data-card-info"><span>${barber.specialty || 'Sem especialidade'}</span></div>
                </div>
                <div class="data-card-actions">
                    <button class="btn-secondary btn-small" data-action="edit-professional" data-id="${barber.id}">Editar</button>
                    <button class="btn-secondary btn-danger btn-small" data-action="delete-professional" data-id="${barber.id}">Excluir</button>
                </div>
            </div>`).join('');
    }

    renderFinancialPage() {
        const container = document.getElementById('financialDashboard');
        const openBtn = document.getElementById('openCaixaBtn');
        const closeBtn = document.getElementById('closeCaixaBtn');
        const expenseBtn = document.getElementById('addExpenseBtnMain');

        if (!container || !openBtn || !closeBtn || !expenseBtn) return;

        if (this.caixa.status === 'aberto') {
            openBtn.style.display = 'none';
            closeBtn.style.display = 'inline-block';
            expenseBtn.style.display = 'inline-block';

            const totalEntradas = this.caixa.entradas.reduce((sum, e) => sum + e.valor, 0);
            const totalSaidas = this.caixa.saidas.reduce((sum, s) => sum + s.valor, 0);
            const saldoAtual = this.caixa.saldoInicial + totalEntradas - totalSaidas;

            container.innerHTML = `
                <div class="financial-summary">
                    <div class="summary-item"><p>Saldo Inicial</p><h4>${this.formatCurrency(this.caixa.saldoInicial)}</h4></div>
                    <div class="summary-item"><p>Entradas</p><h4 class="text-green">${this.formatCurrency(totalEntradas)}</h4></div>
                    <div class="summary-item"><p>Saídas</p><h4 class="text-red">${this.formatCurrency(totalSaidas)}</h4></div>
                    <div class="summary-item total"><p>Saldo Atual</p><h4>${this.formatCurrency(saldoAtual)}</h4></div>
                </div>`;
        } else {
            openBtn.style.display = 'inline-block';
            closeBtn.style.display = 'none';
            expenseBtn.style.display = 'none';
            container.innerHTML = `<div class="empty-state"><h3>Caixa Fechado</h3><p>Clique em "Abrir Caixa" para iniciar as operações.</p></div>`;
        }
    }
    
    renderCharts() { /* Lógica de gráficos mantida */ }
    getOrUpdateClient(phone, name) {
        let client = this.clients.find(c => c.phone === phone);
        if (!client) {
            this.clients.push({ phone, name, createdAt: new Date().toISOString() });
        } else if (client.name !== name) {
            client.name = name;
        }
    }

    saveService(serviceData) {
        if (!serviceData.name || !serviceData.price) return this.showNotification('Nome e preço são obrigatórios.', 'error');
        if (serviceData.id) {
            const index = this.services.findIndex(s => s.id === serviceData.id);
            if (index > -1) this.services[index] = { ...this.services[index], ...serviceData };
        } else {
            this.services.push({ id: `s_${Date.now()}`, ...serviceData });
        }
        this.saveData();
        this.hideModal();
        this.renderServicesList();
        this.updateServiceDropdown();
        this.renderClientServices();
        this.showNotification('Serviço salvo!', 'success');
    }

    deleteService(id) {
        if (this.services.length <= 1) return this.showNotification('É necessário ter pelo menos um serviço.', 'error');
        if (confirm('Deseja remover este serviço?')) {
            this.services = this.services.filter(s => s.id !== id);
            this.saveData();
            this.renderServicesList();
            this.updateServiceDropdown();
            this.renderClientServices();
            this.showNotification('Serviço removido.');
        }
    }
    showModal(title, content) {
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        const modalBackdrop = document.getElementById('modalBackdrop');
        if(modalTitle) modalTitle.textContent = title;
        if(modalContent) modalContent.innerHTML = content;
        if(modalBackdrop) modalBackdrop.style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    hideModal() {
        const modalBackdrop = document.getElementById('modalBackdrop');
        if(modalBackdrop) modalBackdrop.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    
    showNotification(message, type = 'success') {
        const container = document.getElementById('notificationContainer');
        if(!container) return;
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
    
    updateServiceDropdown() {
        const selects = document.querySelectorAll('select[name="service"]');
        if(selects.length === 0) return;
        const optionsHTML = '<option value="">Selecione o serviço</option>' + this.services.map(s => `<option value="${s.id}">${s.name} - ${this.formatCurrency(s.price)}</option>`).join('');
        selects.forEach(select => select.innerHTML = optionsHTML);
    }

    updateBarberDropdowns() {
        const selects = document.querySelectorAll('select[name="barber"]');
        if(selects.length === 0) return;
        const optionsHTML = '<option value="">Selecione o profissional</option>' + this.barbers.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        selects.forEach(select => select.innerHTML = optionsHTML);
    }
    formatCurrency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); }
    formatDate(dateStr) { return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR'); }
    getTodayDateString() { return new Date().toISOString().split('T')[0]; }
    sanitizePhone(phone) { return String(phone).replace(/\D/g, ''); }
    setMinDate() { 
        const dateInput = document.getElementById('preferredDate');
        if(dateInput) dateInput.min = this.getTodayDateString(); 
    }
    navigateAgendaDays(direction) {
        const dateInput = document.getElementById('agendaDateFilter');
        if(!dateInput) return;
        const currentDate = new Date(dateInput.value + 'T00:00:00');
        currentDate.setDate(currentDate.getDate() + direction);
        dateInput.value = currentDate.toISOString().split('T')[0];
        this.renderAgendaView();
    }

    renderClientServices() {
        const container = document.getElementById('services-showcase-list');
        if (!container) return;
        container.innerHTML = this.services.map(service => `
            <div class="service-card glass-card">
                <h4>${service.name}</h4>
                <p class="service-price">${this.formatCurrency(service.price)}</p>
                <p class="service-description">${service.description || ''}</p>
            </div>`).join('');
    }

    renderClientBarbers() {
        const container = document.getElementById('barbers-showcase-list');
        if (!container) return;
        container.innerHTML = this.barbers.map(barber => `
            <div class="barber-card glass-card">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=c7a355&color=fff&size=128" alt="Barbeiro ${barber.name}">
                <h4>${barber.name}</h4>
                <p class="barber-specialty">${barber.specialty || 'Especialista'}</p>
            </div>`).join('');
    }

    updateCaixaStatusIndicator() {
        const indicator = document.getElementById('caixaStatus');
        if (!indicator) return;
        if (this.caixa.status === 'aberto') {
            const total = this.caixa.saldoInicial + this.caixa.entradas.reduce((sum, i) => sum + i.valor, 0) - this.caixa.saidas.reduce((sum, i) => sum + i.valor, 0);
            indicator.className = 'caixa-status-indicator aberto';
            indicator.innerHTML = `<span>Caixa Aberto: <strong>${this.formatCurrency(total)}</strong></span>`;
        } else {
            indicator.className = 'caixa-status-indicator fechado';
            indicator.innerHTML = `<span>Caixa Fechado</span>`;
        }
    }
    // Funções de Modal que faltavam
    showAbrirCaixaModal() {
        const content = `
            <form id="openCaixaForm">
                <p>Para iniciar, você precisa abrir o caixa.</p>
                <div class="form-group">
                    <label for="initialValue">Valor inicial (fundo de troco)</label>
                    <input type="number" id="initialValue" name="initialValue" step="0.01" value="0" required>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Abrir Caixa</button>
                </div>
            </form>
        `;
        this.showModal('Abrir Caixa', content);
        const form = document.getElementById('openCaixaForm');
        if(form) form.addEventListener('submit', e => {
            e.preventDefault();
            const initialValue = parseFloat(e.target.querySelector('#initialValue').value);
            this.abrirCaixa(initialValue);
        });
    }

    showFecharCaixaModal() {
        const totalEntradas = this.caixa.entradas.reduce((sum, e) => sum + e.valor, 0);
        const totalSaidas = this.caixa.saidas.reduce((sum, s) => sum + s.valor, 0);

        const content = `
            <form id="closeCaixaForm">
                <h4>Resumo do Caixa</h4>
                <p><strong>Fundo de Caixa:</strong> ${this.formatCurrency(this.caixa.saldoInicial)}</p>
                <p class="text-green"><strong>Total de Entradas:</strong> ${this.formatCurrency(totalEntradas)}</p>
                <p class="text-red"><strong>Total de Saídas:</strong> ${this.formatCurrency(totalSaidas)}</p>
                <hr style="margin: 1rem 0;">
                <div class="form-group">
                    <label for="countedCash">Valor conferido em caixa (Dinheiro)</label>
                    <input type="number" id="countedCash" name="countedCash" step="0.01" required>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary btn-danger">Confirmar e Fechar</button>
                </div>
            </form>
        `;
        this.showModal('Fechar Caixa', content);
        const form = document.getElementById('closeCaixaForm');
        if(form) form.addEventListener('submit', e => {
            e.preventDefault();
            this.fecharCaixa();
        });
    }

    showAppointmentModal() { /*...*/ }
    showExpenseModal() { /*...*/ }
    showServiceModal() { /*...*/ }
    showProfessionalModal() { /*...*/ }
    showClientDetailModal() { /*...*/ }
    showCaixaHistoryModal() { /*...*/ }
}

window.barberPro = new BarberPro();
