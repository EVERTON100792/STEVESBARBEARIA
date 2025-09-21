// BarberPro - Versão 4.0 - Correção completa de funcionalidade
class BarberPro {
    constructor() {
        this.currentUser = null;
        this.charts = {};
        this.DATA_VERSION = '4.0';
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    init() {
        try {
            this.checkDataVersion();
            this.setupGlobalEventListeners(); 
            this.loadData();

            const token = this.getFromStorage('auth_token', null);
            if (token) {
                this.currentUser = token;
                this.renderBarberView();
            } else {
                this.renderClientView();
            }
        } catch (error) {
            console.error('Erro crítico durante a inicialização:', error);
            this.showNotification('Ocorreu um erro crítico. O sistema não pôde ser carregado.', 'error');
        }
    }

    renderClientView() {
        this.showSection('clientArea');
        this.renderClientServices();
        this.renderClientBarbers();
        this.setMinDate();
    }

    renderBarberView() {
        this.showSection('barberDashboard');
        const agendaDateFilter = document.getElementById('agendaDateFilter');
        if (agendaDateFilter && !agendaDateFilter.value) {
            agendaDateFilter.value = this.getTodayDateString();
        }
        this.switchDashboardView('dashboardView');
    }

    setupGlobalEventListeners() {
        document.body.addEventListener('click', e => {
            const actionTarget = e.target.closest('[data-action]');
            if (actionTarget) {
                e.preventDefault();
                this.handleActionClick(actionTarget.dataset.action, actionTarget.dataset.id);
                return;
            }
            const buttonTarget = e.target.closest('button');
            if(buttonTarget){
                const buttonId = buttonTarget.id;
                switch(buttonId) {
                    case 'sidebarToggle':
                    case 'closeSidebarBtn':
                        document.body.classList.toggle('sidebar-is-open');
                        break;
                    case 'clientAreaBtn': this.renderClientView(); break;
                    case 'barberAreaBtn': this.checkAuthentication(); break;
                    case 'demoLoginBtn': this.login('barbeiro', '123'); break;
                    case 'logoutBtn': case 'logoutBtnSidebar': this.logout(); break;
                    case 'refreshBtn': this.loadDashboardData(); this.showNotification('Dados atualizados!'); break;
                    case 'resetDataBtn': this.resetTestData(); break;
                    case 'prevDayBtn': this.navigateAgendaDays(-1); break;
                    case 'nextDayBtn': this.navigateAgendaDays(1); break;
                    case 'addServiceBtn': this.showServiceModal(); break;
                    case 'addProfessionalBtn': this.showProfessionalModal(); break;
                    case 'addAppointmentBtn': this.showAppointmentModal(true); break;
                    case 'quickAddAppointmentBtn': this.showAppointmentModal(true); break;
                    case 'addWalkInBtn': this.showAppointmentModal(false); break;
                    case 'openCaixaBtn': this.showAbrirCaixaModal(); break;
                    case 'closeCaixaBtn': this.showFecharCaixaModal(); break;
                    case 'viewHistoryBtn': this.showCaixaHistoryModal(); break;
                    case 'addExpenseBtnMain': this.showExpenseModal(); break;
                    case 'closeModalBtn': this.hideModal(); break;
                }
            }
            const navItem = e.target.closest('.sidebar-nav .nav-item:not(.nav-parent)');
            if(navItem) {
                e.preventDefault();
                this.switchDashboardView(navItem.dataset.view);
            }
             const navParent = e.target.closest('.nav-parent');
             if (navParent) {
                 e.preventDefault();
                 const parentGroup = navParent.closest('.nav-group');
                 if (parentGroup) parentGroup.classList.toggle('open');
             }
        });

        document.body.addEventListener('submit', e => {
            e.preventDefault();
            switch(e.target.id){
                case 'bookingForm':
                case 'barberBookingForm':
                case 'serviceForm':
                case 'professionalForm':
                case 'expenseForm':
                case 'openCaixaForm':
                    this.handleFormSubmit(e.target);
                    break;
                case 'loginForm':
                    this.handleLoginSubmit(e.target);
                    break;
            }
        });

        const clientSearchInput = document.getElementById('clientSearchInput');
        if(clientSearchInput) clientSearchInput.addEventListener('input', () => this.renderFullClientsList());

        const agendaDateFilter = document.getElementById('agendaDateFilter');
        if(agendaDateFilter) agendaDateFilter.addEventListener('change', () => this.renderAgendaView());
        
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if(sidebarOverlay) sidebarOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-is-open'));

        const modalBackdrop = document.getElementById('modalBackdrop');
        if(modalBackdrop) modalBackdrop.addEventListener('click', e => { if (e.target.id === 'modalBackdrop') this.hideModal(); });
    }

    handleActionClick(action, id) {
        const actions = {
            'open-comanda-modal': () => this.showComandaActionsModal(id),
            'cancel-appointment': () => this.cancelAppointment(id),
            'edit-service': () => this.showServiceModal(id),
            'delete-service': () => this.deleteService(id),
            'edit-professional': () => this.showProfessionalModal(id),
            'delete-professional': () => this.deleteProfessional(id),
            'view-client-details': () => this.showClientDetailModal(id),
        };
        if (actions[action]) actions[action]();
    }
    
    handleFormSubmit(form) {
        switch(form.id) {
            case 'bookingForm':
            case 'barberBookingForm':
                this.handleAppointmentSubmit(form);
                break;
            case 'serviceForm':
                this.saveService(new FormData(form));
                break;
            case 'professionalForm':
                this.saveProfessional(new FormData(form));
                break;
            case 'expenseForm':
                this.saveExpense(new FormData(form));
                break;
            case 'openCaixaForm':
                const initialValue = parseFloat(new FormData(form).get('initialValue'));
                this.abrirCaixa(initialValue);
                break;
        }
    }

    showSection(sectionId) {
        document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
        const section = document.getElementById(sectionId);
        if(section) section.style.display = 'block';
        
        const navbar = document.querySelector('.navbar');
        if(navbar) navbar.style.display = sectionId === 'barberDashboard' ? 'none' : 'flex';

        const clientAreaBtn = document.getElementById('clientAreaBtn');
        const barberAreaBtn = document.getElementById('barberAreaBtn');
        if(clientAreaBtn && barberAreaBtn){
            clientAreaBtn.classList.toggle('active', sectionId === 'clientArea');
            barberAreaBtn.classList.toggle('active', sectionId !== 'clientArea');
        }
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

    checkAuthentication() {
        const token = this.getFromStorage('auth_token', null);
        if (token) {
            this.currentUser = token;
            this.renderBarberView();
        } else {
            this.showSection('barberLogin');
        }
    }

    login(username, password) {
        if (username === 'barbeiro' && password === '123') {
            this.currentUser = { username: 'barbeiro' };
            this.saveToStorage('auth_token', this.currentUser);
            this.renderBarberView();
            this.showNotification('Login realizado com sucesso!', 'success');
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('barberpro_auth_token');
        this.renderClientView();
        this.showNotification('Você saiu da sua conta.');
    }

    handleLoginSubmit(form) {
        const usernameEl = form.querySelector('#username');
        const passwordEl = form.querySelector('#password');
        if (usernameEl && passwordEl) {
            if (!this.login(usernameEl.value, passwordEl.value)) {
                this.showNotification('Usuário ou senha inválidos.', 'error');
            }
        }
    }

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
            status: isWalkIn ? 'in_progress' : 'scheduled',
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
            this.renderRelevantViews();
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
            this.renderRelevantViews();
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
        this.renderRelevantViews();
    }
    
    cancelAppointment(id) {
        if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
            const appointment = this.appointments.find(a => a.id === id);
            if (appointment) {
                appointment.status = 'cancelled';
                this.saveData();
                this.renderRelevantViews();
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
            id: `caixa_${Date.now()}`, abertura: this.caixa.abertura, fechamento: new Date().toISOString(),
            saldoInicial: this.caixa.saldoInicial, totalEntradas, totalSaidas, saldoEsperadoDinheiro,
            dinheiroConferido: countedCash, diferenca: countedCash - saldoEsperadoDinheiro
        };
        this.caixaHistory.push(closingSummary);
        this.caixa = { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] };
        this.saveData();
        this.hideModal();
        this.updateCaixaStatusIndicator();
        this.renderFinancialPage();
        this.showNotification('Caixa fechado e salvo no histórico.', 'success');
    }

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
        if (!container || !dateFilter || this.barbers.length === 0) {
            if(container) container.innerHTML = '<p class="empty-state">Nenhum profissional cadastrado para exibir a agenda.</p>';
            return;
        };

        const selectedDate = dateFilter.value;
        container.innerHTML = ''; // Limpa antes de renderizar

        const timeSlots = Array.from({ length: (19 - 9) * 4 }, (_, i) => {
            const hour = 9 + Math.floor(i / 4);
            if (hour === 12 || hour === 13) return null;
            const minute = (i % 4) * 15;
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }).filter(Boolean);

        const timeColumnHTML = '<div class="agenda-time-column">' + timeSlots.map(time => `<div class="agenda-time-slot" style="height: 20px;">${time.endsWith(':00') ? `<b>${time}</b>` : time}</div>`).join('') + '</div>';
        
        let barbersAreaHTML = `<div class="agenda-barbers-area" style="grid-template-columns: repeat(${this.barbers.length}, 1fr);">`;
        this.barbers.forEach(barber => {
            barbersAreaHTML += `<div class="agenda-barber-column"><div class="agenda-barber-header">${barber.name}</div><div class="agenda-slots-container" style="height: ${timeSlots.length * 20}px;">`;
            const barberAppointments = this.appointments.filter(a => a.barberId === barber.id && a.date === selectedDate && a.status !== 'cancelled');
            
            barberAppointments.forEach(app => {
                const service = this.services.find(s => s.id === app.service);
                if (!service || !app.time) return;
                try {
                    const [startHour, startMinute] = app.time.split(':').map(Number);
                    let minutesSinceOpening = (startHour - 9) * 60 + startMinute;
                    if(startHour >= 14) minutesSinceOpening -= 120;
                    
                    const topPosition = (minutesSinceOpening / 15) * 20;
                    const height = (service.duration / 15) * 20;

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
    
    renderCharts() { }
    getOrUpdateClient(phone, name) {
        let client = this.clients.find(c => c.phone === phone);
        if (!client) {
            this.clients.push({ phone, name, createdAt: new Date().toISOString() });
        } else if (client.name !== name) {
            client.name = name;
        }
    }

    saveService(formData) {
        const serviceData = {
            id: formData.get('id'), name: formData.get('name'),
            price: parseFloat(formData.get('price')), duration: parseInt(formData.get('duration')),
            description: formData.get('description')
        };
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
    
    saveProfessional(formData) {
        const professionalData = { id: formData.get('id'), name: formData.get('name').trim(), specialty: formData.get('specialty').trim() };
        if (!professionalData.name) return this.showNotification('O nome do profissional é obrigatório.', 'error');
        
        if (professionalData.id) {
            const index = this.barbers.findIndex(b => b.id === professionalData.id);
            if (index > -1) this.barbers[index] = { ...this.barbers[index], ...professionalData };
        } else {
            this.barbers.push({ id: `b_${Date.now()}`, ...professionalData });
        }
        this.saveData();
        this.hideModal();
        this.renderProfessionalsList();
        this.updateBarberDropdowns();
        this.renderClientBarbers();
        this.showNotification('Profissional salvo com sucesso!', 'success');
    }

    deleteProfessional(id) {
        if (this.barbers.length <= 1) return this.showNotification('É necessário ter pelo menos um profissional.', 'error');
        if (confirm('Tem certeza que deseja remover este profissional?')) {
            this.barbers = this.barbers.filter(b => b.id !== id);
            this.saveData();
            this.renderProfessionalsList();
            this.updateBarberDropdowns();
            this.renderClientBarbers();
            this.showNotification('Profissional removido.');
        }
    }
    
    saveExpense(formData) {
        if (!this.checkCaixaStatus()) return;
        const expenseData = { description: formData.get('description'), amount: parseFloat(formData.get('amount')) };
        if(!expenseData.description || !expenseData.amount > 0) return this.showNotification('Preencha todos os campos da despesa.', 'error');

        this.caixa.saidas.push({ descricao: expenseData.description, valor: expenseData.amount, data: new Date().toISOString() });
        this.saveData();
        this.hideModal();
        this.renderFinancialPage();
        this.updateCaixaStatusIndicator();
        this.showNotification('Despesa registrada com sucesso!', 'success');
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
    formatDate(dateStr) { const date = new Date(dateStr); const userTimezoneOffset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR'); }
    getTodayDateString() { return new Date().toISOString().split('T')[0]; }
    sanitizePhone(phone) { return String(phone).replace(/\D/g, ''); }
    setMinDate() { 
        const dateInput = document.getElementById('preferredDate');
        if(dateInput) dateInput.min = this.getTodayDateString(); 
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
    }

    showFecharCaixaModal() {
        const content = `
            <form id="closeCaixaForm" onsubmit="event.preventDefault(); window.barberPro.fecharCaixa();">
                <h4>Resumo do Caixa</h4>
                <p><strong>Fundo de Caixa:</strong> ${this.formatCurrency(this.caixa.saldoInicial)}</p>
                <p class="text-green"><strong>Total de Entradas:</strong> ${this.formatCurrency(this.caixa.entradas.reduce((s,e)=>s+e.valor,0))}</p>
                <p class="text-red"><strong>Total de Saídas:</strong> ${this.formatCurrency(this.caixa.saidas.reduce((s,e)=>s+e.valor,0))}</p>
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
    }

    showServiceModal(id = null) {
        const service = id ? this.services.find(s => s.id === id) : {};
        const content = `
            <form id="serviceForm">
                <input type="hidden" name="id" value="${service.id || ''}">
                <div class="form-group"><label>Nome</label><input type="text" name="name" value="${service.name || ''}" required></div>
                <div class="form-group"><label>Preço (R$)</label><input type="number" step="0.01" name="price" value="${service.price || ''}" required></div>
                <div class="form-group"><label>Duração (min)</label><input type="number" step="15" name="duration" value="${service.duration || '45'}" required></div>
                <div class="form-group"><label>Descrição</label><input type="text" name="description" value="${service.description || ''}"></div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">${service.id ? 'Salvar' : 'Adicionar'}</button>
                </div>
            </form>`;
        this.showModal(service.id ? 'Editar Serviço' : 'Adicionar Serviço', content);
    }
    
    showProfessionalModal(id = null) {
        const professional = id ? this.barbers.find(b => b.id === id) : {};
        const content = `
            <form id="professionalForm">
                <input type="hidden" name="id" value="${professional.id || ''}">
                <div class="form-group"><label>Nome</label><input type="text" name="name" value="${professional.name || ''}" required></div>
                <div class="form-group"><label>Especialidade</label><input type="text" name="specialty" value="${professional.specialty || ''}"></div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">${id ? 'Salvar' : 'Adicionar'}</button>
                </div>
            </form>`;
        this.showModal(id ? 'Editar Profissional' : 'Adicionar Profissional', content);
    }
    
    showAppointmentModal(isScheduled) {
        const agendaDate = document.getElementById('agendaDateFilter')?.value || this.getTodayDateString();
        const content = `
            <form id="barberBookingForm" data-walk-in="${!isScheduled}">
                <div class="form-group"><label>Cliente</label><input type="text" name="name" list="clientSuggestions" placeholder="Buscar ou cadastrar novo" required></div>
                <div class="form-group"><label>Celular (DDD)</label><input type="tel" name="phone" placeholder="11999999999" required></div>
                <div class="form-group"><label>Serviço</label><select name="service" required>${this.generateServiceOptions()}</select></div>
                <div class="form-group"><label>Profissional</label><select name="barber" required>${this.generateBarberOptions()}</select></div>
                ${isScheduled ? `
                <div class="form-group"><label>Data</label><input type="date" name="date" value="${agendaDate}" required></div>
                <div class="form-group"><label>Horário</label><select name="time" required>${this.generateTimeOptions()}</select></div>
                ` : ''}
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Confirmar</button>
                </div>
            </form>`;
        this.showModal(isScheduled ? 'Novo Agendamento' : 'Novo Atendimento (Encaixe)', content);
    }
    
    showClientDetailModal(phone) {
        const client = this.clients.find(c => c.phone === phone);
        if(!client) return;
        const clientAppointments = this.appointments.filter(a => a.phone === phone).sort((a,b)=>new Date(b.date) - new Date(a.date));
        const content = `
            <div class="client-details">
                <h4>${client.name}</h4>
                <p><strong>Telefone:</strong> ${client.phone}</p>
                <p><strong>Cliente desde:</strong> ${this.formatDate(client.createdAt)}</p>
                <hr style="margin: 1rem 0;">
                <h5>Histórico</h5>
                <div class="history-list">${clientAppointments.length > 0 ? clientAppointments.map(a => `<div class="history-item"><span>${this.formatDate(a.date)}</span><span>${this.services.find(s=>s.id===a.service)?.name || ''}</span><span class="status-${a.status}">${a.status}</span></div>`).join('') : '<p>Nenhum histórico.</p>'}</div>
            </div>
        `;
        this.showModal('Detalhes do Cliente', content);
    }

    showCaixaHistoryModal() {
        this.showModal('Histórico de Caixa', `<p>Em construção.</p>`);
    }

    showExpenseModal() {
        if (!this.checkCaixaStatus()) return;
        const content = `
            <form id="expenseForm">
                <div class="form-group"><label>Descrição</label><input type="text" name="description" required></div>
                <div class="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="amount" required></div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Adicionar Despesa</button>
                </div>
            </form>`;
        this.showModal('Adicionar Despesa', content);
    }

    // Funções geradoras de opções para modais
    generateServiceOptions() { return '<option value="">Selecione</option>' + this.services.map(s => `<option value="${s.id}">${s.name} - ${this.formatCurrency(s.price)}</option>`).join(''); }
    generateBarberOptions() { return '<option value="">Selecione</option>' + this.barbers.map(b => `<option value="${b.id}">${b.name}</option>`).join(''); }
    generateTimeOptions() {
        let options = '<option value="">Selecione</option>';
        for (let h = 9; h < 19; h++) {
            if (h === 12 || h === 13) continue;
            for (let m = 0; m < 60; m += 15) {
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                options += `<option value="${time}">${time}</option>`;
            }
        }
        return options;
    }

    // Função para centralizar a atualização de telas
    renderRelevantViews() {
        if (document.getElementById('dashboardView')?.style.display === 'block') this.loadDashboardData();
        if (document.getElementById('appointmentsView')?.style.display === 'block') this.renderAgendaView();
        if (document.getElementById('comandasView')?.style.display === 'block') this.renderPendingAppointments();
    }
}

window.barberPro = new BarberPro();
