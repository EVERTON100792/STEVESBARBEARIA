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

    showSection(sectionId) {
        document.querySelectorAll('.page-section').forEach(section => {
            section.style.display = 'none';
        });
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.display = sectionId === 'barberDashboard' ? 'none' : 'flex';
        }
    }
    
    switchDashboardView(viewId, isInitialLoad = false) {
        if (!viewId) return;
        document.querySelectorAll('.content-view').forEach(view => {
            view.classList.remove('active');
            view.style.display = 'none';
        });
        const viewElement = document.getElementById(viewId);
        if (viewElement) {
            viewElement.style.display = 'block';
            viewElement.classList.add('active');
        }
        const titles = { dashboardView: { title: 'Dashboard', subtitle: 'Visão geral do seu negócio.' }, appointmentsView: { title: 'Agenda', subtitle: 'Visualize e gerencie seus horários.' }, comandasView: { title: 'Atendimentos', subtitle: 'Gerencie os atendimentos pendentes do dia.' }, clientsView: { title: 'Clientes', subtitle: 'Consulte e gerencie sua base de clientes.' }, servicesView: { title: 'Serviços', subtitle: 'Configure os serviços oferecidos.' }, professionalsView: { title: 'Profissionais', subtitle: 'Gerencie a equipe de barbeiros.' }, financialView: { title: 'Caixa', subtitle: 'Acompanhe suas receitas e despesas.' }, reportsView: { title: 'Relatórios', subtitle: 'Analise o desempenho da sua barbearia.' } };
        const newTitle = titles[viewId] || { title: 'BarberPro', subtitle: '' };
        const dashboardTitleEl = document.getElementById('dashboardTitle');
        const dashboardSubtitleEl = document.getElementById('dashboardSubtitle');
        if(dashboardTitleEl) dashboardTitleEl.textContent = newTitle.title;
        if(dashboardSubtitleEl) dashboardSubtitleEl.textContent = newTitle.subtitle;
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
        const activeNavItem = document.querySelector(`.sidebar-nav .nav-item[data-view="${viewId}"]`);
        if(activeNavItem) {
            activeNavItem.classList.add('active');
            const parentGroup = activeNavItem.closest('.nav-group');
            if(parentGroup) {
                parentGroup.querySelector('.nav-parent')?.classList.add('active');
            }
        }
        switch (viewId) {
            case 'appointmentsView': this.renderAgendaView(); break;
            case 'comandasView': this.renderPendingAppointments(); break;
            case 'clientsView': this.renderFullClientsList(); break;
            case 'servicesView': this.renderServicesList(); break;
            case 'professionalsView': this.renderProfessionalsList(); break;
            case 'financialView': this.renderFinancialPage(); break;
            case 'reportsView': this.renderCharts(); break;
            case 'dashboardView': this.loadDashboardData(); break;
        }
        document.querySelector('.dashboard-sidebar')?.classList.remove('show');
    }

    handleAppointmentSubmit(form) {
        const nameInput = form.querySelector('[name="name"]');
        const phoneInput = form.querySelector('[name="phone"]');
        const serviceInput = form.querySelector('[name="service"]');
        const barberInput = form.querySelector('[name="barber"]');
        const dateInput = form.querySelector('[name="date"]');
        const timeInput = form.querySelector('[name="time"]');
        const isWalkIn = form.dataset.walkIn === 'true';
        if (!nameInput?.value.trim() || !phoneInput?.value || !serviceInput?.value || !barberInput?.value || (isWalkIn ? false : !dateInput?.value) || (isWalkIn ? false : !timeInput?.value)) {
            this.showNotification('Por favor, preencha todos os campos.', 'error');
            return;
        }
        const phone = this.sanitizePhone(phoneInput.value);
        if (phone.length < 10) {
            this.showNotification('Por favor, insira um número de telefone válido com DDD.', 'error');
            return;
        }
        const selectedService = this.services.find(s => s.id === serviceInput.value);
        if (!selectedService) {
            this.showNotification('Serviço inválido selecionado.', 'error');
            return;
        }
        const today = new Date();
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today.getTime() - timezoneOffset);
        const appointment = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            name: nameInput.value.trim(),
            phone: phone,
            service: serviceInput.value,
            barberId: barberInput.value,
            date: isWalkIn ? localDate.toISOString().split('T')[0] : dateInput.value,
            time: isWalkIn ? localDate.toTimeString().split(' ')[0].substring(0,5) : timeInput.value,
            status: isWalkIn ? 'pending' : 'scheduled',
            paymentStatus: 'pending',
            paymentMethod: null,
            closedAt: null
        };
        this.getOrUpdateClient(appointment.phone, appointment.name);
        this.appointments.push(appointment);
        this.saveData();
        this.showNotification(isWalkIn ? 'Atendimento criado com sucesso!' : 'Agendamento realizado com sucesso!', 'success');
        if (form.id === 'bookingForm') {
            form.reset();
            this.setMinDate();
        } else {
            this.hideModal();
            if (isWalkIn) this.renderPendingAppointments();
            else this.renderAgendaView();
            this.loadDashboardData();
        }
    }

    getOrUpdateClient(phone, name) {
        let client = this.clients.find(c => c.phone === phone);
        if (client) {
            if (client.name !== name) client.name = name;
        } else {
            client = { phone, name, createdAt: new Date().toISOString() };
            this.clients.push(client);
        }
        return client;
    }

    checkDataVersion() { const storedVersion = localStorage.getItem('barberpro_data_version'); if (storedVersion !== this.DATA_VERSION) { localStorage.clear(); localStorage.setItem('barberpro_data_version', this.DATA_VERSION); } }
    getTodayDateString() { const today = new Date(); const timezoneOffset = today.getTimezoneOffset() * 60000; return new Date(today.getTime() - timezoneOffset).toISOString().split('T')[0]; }
    saveToStorage(key, data) { localStorage.setItem(`barberpro_${key}`, JSON.stringify(data)); }
    getFromStorage(key, defaultValue) { try { const item = localStorage.getItem(`barberpro_${key}`); return item ? JSON.parse(item) : defaultValue; } catch { return defaultValue; } }
    
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
    
    saveData() { this.saveToStorage('services', this.services); this.saveToStorage('barbers', this.barbers); this.saveToStorage('appointments', this.appointments); this.saveToStorage('clients', this.clients); this.saveToStorage('caixa', this.caixa); this.saveToStorage('caixaHistory', this.caixaHistory); }
    
    checkAuthentication() { const token = this.getFromStorage('auth_token', null); if (token) { this.currentUser = token; this.showSection('barberDashboard'); this.loadDashboardData(); this.checkCaixaStatus(true); } else { this.showSection('barberLogin'); } }
    login(username, password) { if (username === 'barbeiro' && password === '123') { this.currentUser = { username: 'barbeiro', name: 'Barbeiro Pro' }; this.saveToStorage('auth_token', this.currentUser); this.showSection('barberDashboard'); this.switchDashboardView('dashboardView', true); this.showNotification('Login realizado com sucesso!', 'success'); this.loadDashboardData(); this.checkCaixaStatus(true); return true; } return false; }
    logout() { this.currentUser = null; localStorage.removeItem('barberpro_auth_token'); this.showSection('clientArea'); document.getElementById('clientAreaBtn')?.classList.add('active'); document.getElementById('barberAreaBtn')?.classList.remove('active'); this.showNotification('Você saiu da sua conta.'); }
    handleLoginSubmit() { const usernameEl = document.getElementById('username'); const passwordEl = document.getElementById('password'); if(usernameEl && passwordEl) { const username = usernameEl.value; const password = passwordEl.value; if (!this.login(username, password)) { this.showNotification('Usuário ou senha inválidos.', 'error'); } } }
    
    loadDashboardData() { if (!this.currentUser) return; this.updateCaixaStatusIndicator(); this.updateStats(); this.renderDashboardAppointments(); }
    updateStats() { const todayStr = this.getTodayDateString(); const todayAppointments = this.appointments.filter(a => a.date === todayStr && a.status === 'scheduled'); const todayRevenue = (this.caixa.entradas || []).filter(e => e.data.startsWith(todayStr)).reduce((sum, e) => sum + e.valor, 0); const pendingCount = this.appointments.filter(a => a.date === todayStr && a.status === 'pending').length; const updateEl = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; }; updateEl('todayCount', todayAppointments.length); updateEl('pendingCount', pendingCount); updateEl('todayProfit', this.formatCurrency(todayRevenue)); }
    
    renderDashboardAppointments() { const appointmentsListEl = document.getElementById('appointmentsList'); if(!appointmentsListEl) return; const today = this.getTodayDateString(); const upcomingAppointments = this.appointments.filter(a => a.date >= today && a.status === 'scheduled').sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time)); appointmentsListEl.innerHTML = upcomingAppointments.length === 0 ? '<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhum agendamento futuro.</p></div>' : upcomingAppointments.map(a => this.createAppointmentCard(a)).join(''); }
    createAppointmentCard(appointment) { const service = this.services.find(s => s.id === appointment.service); const barber = this.barbers.find(b => b.id === appointment.barberId); const statusMap = { scheduled: { text: 'Agendado', class: 'status-scheduled' }, completed: { text: 'Concluído', class: 'status-completed' }, cancelled: { text: 'Cancelado', class: 'status-cancelled' }, pending: { text: 'Pendente', class: 'status-pending'} }; const status = statusMap[appointment.status] || statusMap.scheduled; let actionButton = ''; if (appointment.status === 'scheduled' || appointment.status === 'pending') { actionButton = `<button class="btn-primary btn-small" data-action="show-finalize-modal" data-id="${appointment.id}">Finalizar Atendimento</button>`; } return ` <div class="appointment-card status-${appointment.status}"> <div class="appointment-header"> <div class="appointment-client"><h4>${appointment.name}</h4><p>${this.formatDate(appointment.date)} - ${appointment.time}h</p></div> <div class="appointment-time"><p>${barber?.name || 'N/A'}</p><span class="appointment-status ${status.class}">${status.text}</span></div> </div> <div class="appointment-footer"> <p class="appointment-service">${service?.name || 'Serviço'} - <strong>${this.formatCurrency(service?.price || 0)}</strong></p> <div class="appointment-actions">${actionButton}</div> </div> </div>`; }
    
    checkCaixaStatus(isInitialLoad = false) { if (this.caixa.status === 'fechado') { if (!isInitialLoad) { this.showNotification('O caixa está fechado. É preciso abri-lo para iniciar um atendimento.', 'error'); this.showAbrirCaixaModal(); } return false; } return true; }
    abrirCaixa(valorInicial) { if (isNaN(valorInicial)) { this.showNotification('Valor inicial inválido.', 'error'); return; } this.caixa = { status: 'aberto', saldoInicial: valorInicial, abertura: new Date().toISOString(), entradas: [], saidas: [] }; this.saveData(); this.hideModal(); this.updateCaixaStatusIndicator(); this.renderFinancialPage(); this.showNotification(`Caixa aberto com ${this.formatCurrency(valorInicial)}!`, 'success'); }
    fecharCaixa() { const countedCashInput = document.getElementById('countedCash'); const countedCash = countedCashInput ? (parseFloat(countedCashInput.value) || 0) : 0; const totalsByMethod = this.caixa.entradas.reduce((acc, entrada) => { acc[entrada.metodo] = (acc[entrada.metodo] || 0) + entrada.valor; return acc; }, {}); const totalEntradas = this.caixa.entradas.reduce((sum, item) => sum + item.valor, 0); const totalSaidas = this.caixa.saidas.reduce((sum, item) => sum + item.valor, 0); const dinheiroEntradas = totalsByMethod['Dinheiro'] || 0; const saldoEsperadoDinheiro = this.caixa.saldoInicial + dinheiroEntradas - totalSaidas; const closingSummary = { id: `caixa_${Date.now()}`, abertura: this.caixa.abertura, fechamento: new Date().toISOString(), saldoInicial: this.caixa.saldoInicial, entradas: this.caixa.entradas, saidas: this.caixa.saidas, totalEntradas: totalEntradas, entradasPorMetodo: totalsByMethod, totalSaidas: totalSaidas, saldoEsperadoDinheiro: saldoEsperadoDinheiro, dinheiroConferido: countedCash, diferenca: countedCash - saldoEsperadoDinheiro }; this.caixaHistory.push(closingSummary); this.caixa = { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] }; this.saveData(); this.hideModal(); this.updateCaixaStatusIndicator(); this.renderFinancialPage(); this.showNotification('Caixa fechado e salvo no histórico com sucesso.', 'success'); }
    showCaixaHistoryModal() { const historyItems = this.caixaHistory.sort((a, b) => new Date(b.fechamento) - new Date(a.fechamento)).map(item => { const differenceClass = item.diferenca < 0 ? 'text-red' : item.diferenca > 0 ? 'text-green' : ''; return ` <div class="history-item"> <span><strong>Fechamento:</strong> ${this.formatDateTime(item.fechamento)}<br><strong>Faturamento:</strong> ${this.formatCurrency(item.totalEntradas)}</span> <span class="${differenceClass}"><strong>Diferença:</strong><br>${this.formatCurrency(item.diferenca)}</span> </div>`; }).join(''); const content = ` <div class="history-list"> ${this.caixaHistory.length > 0 ? historyItems : '<p class="empty-state">Nenhum fechamento de caixa anterior encontrado.</p>'} </div> <div class="modal-footer"><button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Fechar</button></div>`; this.showModal('Histórico de Fechamentos de Caixa', content); }
    updateCaixaStatusIndicator() { const indicator = document.getElementById('caixaStatus'); if (!indicator) return; if (this.caixa.status === 'aberto') { const total = this.caixa.saldoInicial + this.caixa.entradas.reduce((sum, i) => sum + i.valor, 0) - this.caixa.saidas.reduce((sum, i) => sum + i.valor, 0); indicator.className = 'caixa-status-indicator aberto'; indicator.innerHTML = `<span>Caixa Aberto: <strong>${this.formatCurrency(total)}</strong></span>`; } else { indicator.className = 'caixa-status-indicator fechado'; indicator.innerHTML = `<span>Caixa Fechado</span>`; } }
    
    renderPendingAppointments() { const container = document.getElementById('pendingAppointmentsList'); if(!container) return; const todayStr = this.getTodayDateString(); const pending = this.appointments.filter(a => a.date === todayStr && a.status === 'pending'); container.innerHTML = pending.length === 0 ? '<div class="empty-state"><div class="empty-icon">🧾</div><p>Nenhum atendimento pendente para hoje.</p></div>' : pending.map(app => this.createAppointmentCard(app)).join(''); }
    showFinalizeAppointmentModal(appointmentId) { if (!this.checkCaixaStatus()) return; const appointment = this.appointments.find(a => a.id === appointmentId); if (!appointment) return; const service = this.services.find(s => s.id === appointment.service); if (!service) { this.showNotification('Serviço não encontrado.', 'error'); return; } const content = ` <form id="finalizeForm"> <p>Finalizando atendimento de <strong>${appointment.name}</strong>.</p> <p>Serviço: <strong>${service.name}</strong></p> <h4 style="margin-top: 1rem;">Total: ${this.formatCurrency(service.price)}</h4> <div class="form-group" style="margin-top:1.5rem"> <label for="paymentMethod">Forma de Pagamento</label> <select id="paymentMethod" name="paymentMethod" required> <option value="Dinheiro">Dinheiro</option> <option value="Pix">Pix</option> <option value="Cartão de Débito">Cartão de Débito</option> <option value="Cartão de Crédito">Cartão de Crédito</option> </select> </div> <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button> <button type="submit" class="btn-primary">Confirmar Pagamento</button> </div> </form> `; this.showModal('Finalizar e Receber', content); document.getElementById('finalizeForm')?.addEventListener('submit', (e) => { e.preventDefault(); const paymentMethod = e.target.querySelector('[name="paymentMethod"]').value; this.finalizeAppointment(appointmentId, paymentMethod); }); }
    finalizeAppointment(appointmentId, paymentMethod) { const appointment = this.appointments.find(a => a.id === appointmentId); if (!appointment) return; const service = this.services.find(s => s.id === appointment.service); if (!service) return; this.caixa.entradas.push({ descricao: `Serviço: ${service.name} (${appointment.name})`, valor: service.price, data: new Date().toISOString(), metodo: paymentMethod }); appointment.status = 'completed'; appointment.paymentStatus = 'paid'; appointment.paymentMethod = paymentMethod; appointment.closedAt = new Date().toISOString(); this.saveData(); this.hideModal(); this.showNotification(`Pagamento de ${this.formatCurrency(service.price)} recebido!`, 'success'); this.renderAgendaView(); this.renderPendingAppointments(); this.loadDashboardData(); }
    showModal(title, content, options = {}) { document.body.classList.add('modal-open'); const modalTitleEl = document.getElementById('modalTitle'); const modalContentEl = document.getElementById('modalContent'); const modalBackdropEl = document.getElementById('modalBackdrop'); const modalContainerEl = document.getElementById('modalContainer'); if(modalTitleEl) modalTitleEl.textContent = title; if(modalContentEl) modalContentEl.innerHTML = content; if(modalBackdropEl) modalBackdropEl.style.display = 'flex'; if(modalContainerEl) modalContainerEl.style.maxWidth = options.width || '600px'; }
    hideModal() { document.body.classList.remove('modal-open'); const modalBackdropEl = document.getElementById('modalBackdrop'); if (modalBackdropEl) modalBackdropEl.style.display = 'none'; }
    showNotification(message, type = 'success') { const container = document.getElementById('notificationContainer'); if (!container) return; const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; container.appendChild(notification); setTimeout(() => { notification.remove(); }, 4000); }
    updateServiceDropdown() { const serviceSelects = document.querySelectorAll('select[name="service"]'); const sortedServices = [...this.services].sort((a,b) => a.name.localeCompare(b.name)); let optionsHTML = '<option value="">Selecione o serviço</option>' + sortedServices.map(s => `<option value="${s.id}" data-price="${s.price || 0}">${s.name} - ${this.formatCurrency(s.price || 0)}</option>`).join(''); serviceSelects.forEach(select => { select.innerHTML = optionsHTML; }); }
    updateBarberDropdowns() { const barberSelects = document.querySelectorAll('select[name="barber"]'); const sortedBarbers = [...this.barbers].sort((a, b) => a.name.localeCompare(b.name)); let optionsHTML = '<option value="">Selecione o profissional</option>' + sortedBarbers.map(b => `<option value="${b.id}">${b.name}</option>`).join(''); barberSelects.forEach(select => { select.innerHTML = optionsHTML; }); }
    showServiceModal(id = null) { const service = id ? this.services.find(s => s.id === id) : {}; const content = ` <form id="serviceForm"> <input type="hidden" name="id" value="${service.id || ''}"> <div class="form-group"><label>Nome do Serviço</label><input type="text" name="name" value="${service.name || ''}" required></div> <div class="form-group"><label>Preço (R$)</label><input type="number" step="0.01" name="price" value="${service.price || ''}" required></div> <div class="form-group"><label>Duração (minutos)</label><input type="number" step="15" name="duration" value="${service.duration || '45'}" required></div> <div class="form-group"><label>Descrição</label><input type="text" name="description" value="${service.description || ''}"></div> <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button> <button type="submit" class="btn-primary">${service.id ? 'Salvar' : 'Adicionar'}</button> </div> </form>`; this.showModal(service.id ? 'Editar Serviço' : 'Adicionar Serviço', content); document.getElementById('serviceForm')?.addEventListener('submit', e => { e.preventDefault(); const formData = new FormData(e.target); const serviceData = { id: formData.get('id'), name: formData.get('name'), price: parseFloat(formData.get('price')), duration: parseInt(formData.get('duration')), description: formData.get('description') }; this.saveService(serviceData); }); }
    resetTestData() { if (confirm('ATENÇÃO!\n\nIsto irá apagar TODOS os agendamentos, clientes e dados financeiros, INCLUINDO O HISTÓRICO. Serviços e profissionais serão mantidos.\n\nDeseja continuar?')) { this.appointments = []; this.clients = []; this.caixa = { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] }; this.caixaHistory = []; this.saveData(); this.loadDashboardData(); this.switchDashboardView('dashboardView'); this.showNotification('Dados de teste foram zerados.', 'success'); } }
    formatCurrency(value) { if (typeof value !== 'number') return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
    formatDate(dateString) { const date = new Date(dateString); return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
    formatDateTime(dateString) { const date = new Date(dateString); return date.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}); }
    sanitizePhone(phone) { return String(phone).replace(/[^0-9]/g, ''); }
    showProfessionalModal(id = null) { const professional = id ? this.barbers.find(b => b.id === id) : {}; const content = ` <form id="professionalForm"> <input type="hidden" name="id" value="${professional.id || ''}"> <div class="form-group"> <label>Nome do Profissional</label> <input type="text" name="name" value="${professional.name || ''}" placeholder="Nome completo" required> </div> <div class="form-group"> <label>Especialidade</label> <input type="text" name="specialty" value="${professional.specialty || ''}" placeholder="Ex: Corte, Barba, Química"> </div> <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button> <button type="submit" class="btn-primary">${id ? 'Salvar Alterações' : 'Adicionar Profissional'}</button> </div> </form> `; this.showModal(id ? 'Editar Profissional' : 'Adicionar Profissional', content); document.getElementById('professionalForm')?.addEventListener('submit', e => { e.preventDefault(); const formData = new FormData(e.target); const professionalData = { id: formData.get('id'), name: formData.get('name').trim(), specialty: formData.get('specialty').trim() }; this.saveProfessional(professionalData); }); }
    showClientDetailModal(phone) { const client = this.clients.find(c => c.phone === phone); if (!client) { this.showNotification('Cliente não encontrado.', 'error'); return; } const clientAppointments = this.appointments.filter(a => a.phone === phone).sort((a, b) => new Date(b.date) - new Date(a.date)); const totalSpent = clientAppointments.filter(a => a.status === 'completed').reduce((sum, a) => { const service = this.services.find(s => s.id === a.service); return sum + (service?.price || 0); }, 0); const lastVisitAppointment = clientAppointments.find(a => a.status === 'completed'); let absenceString = 'Nenhuma visita concluída.'; if (lastVisitAppointment) { const lastVisitDate = new Date(lastVisitAppointment.date); const today = new Date(); const diffTime = Math.abs(today - lastVisitDate); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (this.formatDate(lastVisitDate) === this.formatDate(today)) { absenceString = 'Hoje'; } else if (diffDays === 1) { absenceString = 'Ontem'; } else { absenceString = `Há ${diffDays} dias`; } } const historyHTML = clientAppointments.length > 0 ? clientAppointments.map(a => { const service = this.services.find(s => s.id === a.service); const statusMap = { scheduled: 'Agendado', completed: 'Concluído', cancelled: 'Cancelado', pending: 'Pendente' }; return `<div class="history-item"> <span>${this.formatDate(a.date)} - ${service?.name || 'Serviço'}</span> <span>${this.formatCurrency(service?.price || 0)}</span> <span class="appointment-status status-${a.status}">${statusMap[a.status] || a.status}</span> </div>`; }).join('') : '<p class="empty-state" style="padding: 1rem 0;">Nenhum histórico de agendamento.</p>'; const content = ` <div class="client-details"> <h4>${client.name}</h4> <p><strong>Telefone:</strong> ${client.phone}</p> <p><strong>Cliente desde:</strong> ${this.formatDate(client.createdAt)}</p> <div class="separator" style="margin: 1rem 0;"></div> <p><strong>Total Gasto:</strong> ${this.formatCurrency(totalSpent)}</p> <p><strong>Total de Visitas:</strong> ${clientAppointments.length}</p> <p><strong>Última Visita:</strong> ${absenceString}</p> <div class="separator" style="margin: 1rem 0;"></div> <h5>Histórico de Atendimentos</h5> <div class="history-list" style="margin-top: 1rem;">${historyHTML}</div> </div> <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Fechar</button> </div> `; this.showModal('Detalhes do Cliente', content); }
    deleteService(id) { if (this.services.length <= 1) { this.showNotification('É necessário ter pelo menos um serviço cadastrado.', 'error'); return; } if (confirm('Tem certeza que deseja remover este serviço?')) { this.services = this.services.filter(s => s.id !== id); this.saveData(); this.renderServicesList(); this.updateServiceDropdown(); this.renderClientServices(); this.showNotification('Serviço removido.'); } }
    saveProfessional(professionalData) { if (!professionalData.name || professionalData.name.trim() === '') { this.showNotification('O nome do profissional é obrigatório.', 'error'); return; } const existingProfessional = this.barbers.find(b => b.name.toLowerCase() === professionalData.name.toLowerCase() && b.id !== professionalData.id); if (existingProfessional) { this.showNotification('Já existe um profissional com este nome.', 'error'); return; } if (professionalData.id) { const index = this.barbers.findIndex(b => b.id === professionalData.id); if (index > -1) { this.barbers[index] = { ...this.barbers[index], ...professionalData }; } } else { this.barbers.push({ id: `b_${Date.now()}`, ...professionalData }); } this.saveData(); this.hideModal(); this.renderProfessionalsList(); this.updateBarberDropdowns(); this.renderClientBarbers(); this.showNotification('Profissional salvo com sucesso!', 'success'); }
    deleteProfessional(id) { if (this.barbers.length <= 1) { this.showNotification('É necessário ter pelo menos um profissional cadastrado.', 'error'); return; } if (confirm('Tem certeza que deseja remover este profissional?')) { this.barbers = this.barbers.filter(b => b.id !== id); this.saveData(); this.renderProfessionalsList(); this.updateBarberDropdowns(); this.renderClientBarbers(); this.showNotification('Profissional removido.'); } }
    saveExpense(expenseData) { if (!this.checkCaixaStatus()) return; this.caixa.saidas.push({ descricao: expenseData.description, valor: expenseData.amount, data: new Date().toISOString() }); this.saveData(); this.hideModal(); this.loadDashboardData(); if (document.getElementById('financialView')?.style.display === 'block') { this.renderFinancialPage(); } this.showNotification('Despesa registrada com sucesso!', 'success'); }
    setMinDate() { const dateInput = document.getElementById('preferredDate'); if (dateInput) dateInput.min = this.getTodayDateString(); }
    showExpenseModal() { if (!this.checkCaixaStatus()) return; const content = ` <form id="expenseForm"> <div class="form-group"><label>Descrição</label><input type="text" name="description" placeholder="Ex: Compra de lâminas" required></div> <div class="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="amount" required></div> <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button> <button type="submit" class="btn-primary">Adicionar Despesa</button> </div> </form>`; this.showModal('Adicionar Nova Despesa', content); document.getElementById('expenseForm')?.addEventListener('submit', e => { e.preventDefault(); const formData = new FormData(e.target); const expenseData = { description: formData.get('description'), amount: parseFloat(formData.get('amount')) }; if (expenseData.description && expenseData.amount > 0) { this.saveExpense(expenseData); } else { this.showNotification('Por favor, preencha todos os campos da despesa.', 'error'); } }); }
    cancelAppointment(id) { if (confirm('Tem certeza que deseja cancelar este agendamento?')) { const appointment = this.appointments.find(a => a.id === id); if (appointment) { appointment.status = 'cancelled'; this.saveData(); this.loadDashboardData(); this.renderAgendaView(); this.renderPendingAppointments(); this.showNotification('Agendamento cancelado.'); } } }
    showAppointmentModal(isScheduled) { const clientSuggestionsEl = document.getElementById('clientSuggestions'); if(clientSuggestionsEl) clientSuggestionsEl.innerHTML = this.clients.map(c => `<option value="${c.name}"></option>`).join(''); const serviceOptions = this.services.map(s => `<option value="${s.id}">${s.name} - ${this.formatCurrency(s.price)}</option>`).join(''); const barberOptions = this.barbers.map(b => `<option value="${b.id}">${b.name}</option>`).join(''); const timeOptions = []; for (let h = 9; h < 19; h++) { for (let m = 0; m < 60; m += 15) { if (h >= 12 && h < 14) continue; const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; timeOptions.push(`<option value="${time}">${time}</option>`); } } const agendaDateFilterValue = document.getElementById('agendaDateFilter')?.value || this.getTodayDateString(); const dateAndTimeFields = isScheduled ? ` <div class="form-group"><label>Data</label><input type="date" name="date" value="${agendaDateFilterValue}" required></div> <div class="form-group"><label>Horário</label><select name="time" required><option value="">Selecione</option>${timeOptions.join('')}</select></div> ` : ''; const content = ` <form id="barberBookingForm" data-walk-in="${!isScheduled}"> <div class="form-group"><label>Cliente</label><input type="text" name="name" list="clientSuggestions" placeholder="Digite para buscar ou cadastrar novo" required></div> <div class="form-group"><label>Celular (com DDD)</label><input type="tel" name="phone" placeholder="11999999999" required></div> <div class="form-group"><label>Serviço</label><select name="service" required><option value="">Selecione</option>${serviceOptions}</select></div> <div class="form-group"><label>Profissional</label><select name="barber" required><option value="">Selecione</option>${barberOptions}</select></div> ${dateAndTimeFields} <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button> <button type="submit" class="btn-primary">Confirmar</button> </div> </form>`; this.showModal(isScheduled ? 'Novo Agendamento' : 'Novo Atendimento (Encaixe)', content); const form = document.getElementById('barberBookingForm'); if(!form) return; const nameInput = form.querySelector('[name="name"]'); const phoneInput = form.querySelector('[name="phone"]'); nameInput?.addEventListener('input', () => { const existingClient = this.clients.find(c => c.name === nameInput.value); if (existingClient && phoneInput) { phoneInput.value = existingClient.phone; } }); form.addEventListener('submit', e => { e.preventDefault(); this.handleAppointmentSubmit(e.target); }); }
    navigateAgendaDays(direction) { const dateInput = document.getElementById('agendaDateFilter'); if (!dateInput) return; try { const currentDate = new Date(dateInput.value + 'T00:00:00Z'); if (isNaN(currentDate.getTime())) { dateInput.value = this.getTodayDateString(); return; } currentDate.setDate(currentDate.getDate() + direction); dateInput.value = currentDate.toISOString().split('T')[0]; this.renderAgendaView(); } catch (e) { console.error('Erro ao navegar entre datas:', e); dateInput.value = this.getTodayDateString(); } }
    renderClientServices() { const container = document.getElementById('services-showcase-list'); if (!container) return; container.innerHTML = this.services.map(service => ` <div class="service-card glass-card"> <h4>${service.name}</h4> <p class="service-price">${this.formatCurrency(service.price)}</p> <p class="service-description">${service.description || ''}</p> </div> `).join(''); }
    renderClientBarbers() { const container = document.getElementById('barbers-showcase-list'); if (!container) return; container.innerHTML = this.barbers.map(barber => ` <div class="barber-card glass-card"> <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=c7a355&color=fff&size=128" alt="Barbeiro ${barber.name}"> <h4>${barber.name}</h4> <p class="barber-specialty">${barber.specialty || 'Especialista'}</p> </div> `).join(''); }
    renderFullClientsList() { const container = document.getElementById('fullClientsList'); const searchInput = document.getElementById('clientSearchInput'); if(!container || !searchInput) return; const searchTerm = searchInput.value.toLowerCase(); const clients = this.clients.filter(c => c.name.toLowerCase().includes(searchTerm) || c.phone.includes(searchTerm)).sort((a,b) => a.name.localeCompare(b.name)); container.innerHTML = clients.length === 0 ? '<div class="empty-state"><p>Nenhum cliente encontrado.</p></div>' : clients.map(client => { const clientAppointments = this.appointments.filter(a => a.phone === client.phone); const totalVisits = clientAppointments.length; const lastVisitAppointment = clientAppointments.filter(a => a.status === 'completed').sort((a,b) => b.date.localeCompare(a.date))[0]; const lastVisit = lastVisitAppointment ? this.formatDate(lastVisitAppointment.date) : 'N/A'; return `<div class="data-card"><div><strong>${client.name}</strong><div class="data-card-info"><span>📞 ${client.phone}</span><span>📅 Visitas: ${totalVisits}</span><span>📍 Última Visita: ${lastVisit}</span></div></div><div class="data-card-actions"><button class="btn-secondary btn-small" data-action="view-client-details" data-id="${client.phone}">Ver Detalhes</button></div></div>`; }).join(''); }
    renderCharts() { Object.values(this.charts).forEach(chart => chart?.destroy()); if(typeof Chart === 'undefined' || typeof ChartDataLabels === 'undefined') return; Chart.register(ChartDataLabels); const revenueCtxEl = document.getElementById('revenueChart'); if(revenueCtxEl) { const revenueCtx = revenueCtxEl.getContext('2d'); const weeklyData = { labels: [], data: [] }; for (let i = 6; i >= 0; i--) { const date = new Date(); date.setDate(date.getDate() - i); const dateStr = date.toISOString().split('T')[0]; weeklyData.labels.push(date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })); const dailyRevenue = this.appointments.filter(a => a.date === dateStr && a.status === 'completed').reduce((sum, a) => { const service = this.services.find(s => s.id === a.service); return sum + (service ? service.price : 0); }, 0); weeklyData.data.push(dailyRevenue); } this.charts.revenueChart = new Chart(revenueCtx, { type: 'bar', data: { labels: weeklyData.labels, datasets: [{ label: 'Faturamento Diário', data: weeklyData.data, backgroundColor: 'rgba(199, 163, 85, 0.7)' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } }); } const servicesCtxEl = document.getElementById('servicesChart'); if(servicesCtxEl) { const servicesCtx = servicesCtxEl.getContext('2d'); const serviceAnalytics = this.services.map(s => { const appointments = this.appointments.filter(a => a.service === s.id && a.status === 'completed'); return { name: s.name, count: appointments.length, revenue: appointments.length * s.price }; }).filter(s => s.count > 0).sort((a, b) => b.revenue - a.revenue); this.charts.servicesChart = new Chart(servicesCtx, { type: 'bar', data: { labels: serviceAnalytics.map(s => s.name), datasets: [{ label: 'Faturamento por Serviço', data: serviceAnalytics.map(s => s.revenue), backgroundColor: 'rgba(59, 130, 246, 0.7)' }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } } } }); } }
}

window.barberPro = new BarberPro();
