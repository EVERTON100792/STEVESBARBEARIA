// BarberPro - Versão com Melhorias de Caixa e Usabilidade
class BarberPro {
    constructor() {
        this.currentUser = null;
        this.charts = {};
        this.DATA_VERSION = '2.0'; // Versão incrementada para as novas features
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
                agendaDateFilter.value = this.getTodayDateString();
            }
        } catch (error) {
            console.error('Erro durante a inicialização:', error);
            this.showNotification('Ocorreu um erro crítico. Tente limpar os dados do site.', 'error');
        }
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
        
        const titles = { dashboardView: { title: 'Dashboard', subtitle: 'Visão geral do seu negócio.' }, appointmentsView: { title: 'Agenda', subtitle: 'Visualize e gerencie seus horários.' }, comandasView: { title: 'Comandas', subtitle: 'Gerencie os atendimentos em aberto.' }, clientsView: { title: 'Clientes', subtitle: 'Consulte e gerencie sua base de clientes.' }, servicesView: { title: 'Serviços', subtitle: 'Configure os serviços oferecidos.' }, professionalsView: { title: 'Profissionais', subtitle: 'Gerencie a equipe de barbeiros.' }, financialView: { title: 'Caixa', subtitle: 'Acompanhe suas receitas e despesas.' }, reportsView: { title: 'Relatórios', subtitle: 'Analise o desempenho da sua barbearia.' } };
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
                if (isInitialLoad || !parentGroup.classList.contains('open')) {
                    parentGroup.classList.add('open');
                    const submenu = parentGroup.querySelector('.nav-submenu');
                    if (submenu) submenu.style.maxHeight = submenu.scrollHeight + "px";
                }
            }
        }
        
        switch (viewId) {
            case 'appointmentsView': this.renderAgendaView(); break;
            case 'comandasView': this.renderComandasView(); break;
            case 'clientsView': this.renderFullClientsList(); break;
            case 'servicesView': this.renderServicesList(); break;
            case 'professionalsView': this.renderProfessionalsList(); break;
            case 'financialView': this.renderFinancialPage(); break;
            case 'reportsView': this.renderCharts(); break;
            case 'dashboardView': this.loadDashboardData(); break;
        }
        document.querySelector('.dashboard-sidebar')?.classList.remove('show');
    }
    
    // =======================================================
    // ========= ÁREA PRINCIPAL DA CORREÇÃO NO JS ==========
    // =======================================================
    setupEventListeners() {
        // Helper function to safely add event listeners
        const safeAddEventListener = (selector, event, handler, isId = true) => {
            const element = isId ? document.getElementById(selector) : document.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                // console.warn(`Elemento não encontrado: ${selector}`);
            }
        };

        const clientAreaBtn = document.getElementById('clientAreaBtn');
        const barberAreaBtn = document.getElementById('barberAreaBtn');
        if (clientAreaBtn) { clientAreaBtn.addEventListener('click', () => { this.showSection('clientArea'); clientAreaBtn.classList.add('active'); barberAreaBtn?.classList.remove('active'); }); }
        if (barberAreaBtn) { barberAreaBtn.addEventListener('click', () => { barberAreaBtn.classList.add('active'); clientAreaBtn?.classList.remove('active'); this.checkAuthentication(); }); }
        
        document.querySelectorAll('.nav-parent').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const group = button.closest('.nav-group');
                if(!group) return;
                const submenu = group.querySelector('.nav-submenu');
                if(!submenu) return;
                const isOpen = group.classList.contains('open');

                document.querySelectorAll('.nav-group.open').forEach(otherGroup => {
                    if(otherGroup !== group) {
                        otherGroup.classList.remove('open');
                        otherGroup.querySelector('.nav-submenu').style.maxHeight = '0';
                    }
                });

                if(!isOpen) {
                    group.classList.add('open');
                    submenu.style.maxHeight = submenu.scrollHeight + "px";
                } else {
                    group.classList.remove('open');
                    submenu.style.maxHeight = '0';
                }
            });
        });
        
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => { if (!item.classList.contains('nav-parent')) { item.addEventListener('click', (e) => { e.preventDefault(); this.switchDashboardView(item.dataset.view); }); } });
        
        safeAddEventListener('addComandaBtn', 'click', () => this.showNewComandaModal());
        safeAddEventListener('bookingForm', 'submit', e => { e.preventDefault(); this.handleAppointmentSubmit(e.target); });
        safeAddEventListener('loginForm', 'submit', e => { e.preventDefault(); this.handleLoginSubmit(); });
        safeAddEventListener('demoLoginBtn', 'click', () => this.login('barbeiro', '123'));
        safeAddEventListener('logoutBtn', 'click', () => this.logout());
        safeAddEventListener('logoutBtnSidebar', 'click', () => this.logout());
        safeAddEventListener('refreshBtn', 'click', () => { this.loadData(); this.loadDashboardData(); this.showNotification('Dados atualizados!'); });
        safeAddEventListener('sidebarToggle', 'click', () => document.querySelector('.dashboard-sidebar')?.classList.toggle('show'));
        safeAddEventListener('clientSearchInput', 'input', () => this.renderFullClientsList());
        safeAddEventListener('resetDataBtn', 'click', () => this.resetTestData());
        safeAddEventListener('agendaDateFilter', 'change', () => this.renderAgendaView());
        safeAddEventListener('prevDayBtn', 'click', () => this.navigateAgendaDays(-1));
        safeAddEventListener('nextDayBtn', 'click', () => this.navigateAgendaDays(1));
        safeAddEventListener('addServiceBtn', 'click', () => this.showServiceModal());
        safeAddEventListener('addProfessionalBtn', 'click', () => this.showProfessionalModal());
        safeAddEventListener('addExpenseBtnMain', 'click', () => this.showExpenseModal());
        safeAddEventListener('addAppointmentBtn', 'click', () => this.showAppointmentModal());
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
                case 'abrir-comanda': this.abrirComanda(id); break;
                case 'show-payment-modal': this.showPaymentModal(id); break;
                case 'cancel-appointment': this.cancelAppointment(id); break;
                case 'edit-service': this.showServiceModal(id); break;
                case 'delete-service': this.deleteService(id); break;
                case 'edit-professional': this.showProfessionalModal(id); break;
                case 'delete-professional': this.deleteProfessional(id); break;
                case 'view-client-details': this.showClientDetailModal(id); break;
                case 'send-reminder': this.markReminderAsSent(action, id); break;
            }
        });
    }

    saveService(serviceData) {
        if (!serviceData.name || !serviceData.price || !serviceData.duration) {
            this.showNotification('Todos os campos são obrigatórios!', 'error');
            return;
        }

        serviceData.price = parseFloat(serviceData.price);
        serviceData.duration = parseInt(serviceData.duration);

        if (isNaN(serviceData.price) || serviceData.price <= 0 || isNaN(serviceData.duration) || serviceData.duration <= 0) {
            this.showNotification('Por favor, insira um preço e duração válidos!', 'error');
            return;
        }
        
        if (serviceData.id) {
            const index = this.services.findIndex(s => s.id === serviceData.id);
            if (index !== -1) {
                this.services[index] = { ...this.services[index], ...serviceData };
                 this.showNotification('Serviço atualizado com sucesso!', 'success');
            }
        } else { 
            const newId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.services.push({ ...serviceData, id: newId });
            this.showNotification('Serviço adicionado com sucesso!', 'success');
        }

        this.saveData();
        this.hideModal();
        
        this.renderServicesList();
        this.updateServiceDropdown();
        this.renderClientServices();
        if (document.getElementById('reportsView')?.classList.contains('active')) {
            this.renderCharts();
        }
    }

    handleAppointmentSubmit(form) {
        const nameInput = form.querySelector('[name="name"]');
        const phoneInput = form.querySelector('[name="phone"]');
        const serviceInput = form.querySelector('[name="service"]');
        const barberInput = form.querySelector('[name="barber"]');
        const dateInput = form.querySelector('[name="date"]');
        const timeInput = form.querySelector('[name="time"]');

        if (!nameInput?.value.trim() || !phoneInput?.value || !serviceInput?.value || !barberInput?.value || !dateInput?.value || !timeInput?.value) {
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
            this.showNotification('Serviço inválido selecionado. Por favor, recarregue a página.', 'error');
            return;
        }
        
        const appointment = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            status: 'scheduled',
            name: nameInput.value.trim(),
            phone: phone,
            service: serviceInput.value,
            barberId: barberInput.value,
            date: dateInput.value,
            time: timeInput.value
        };

        this.getOrUpdateClient(appointment.phone, appointment.name);
        this.appointments.push(appointment);
        this.saveData();
        this.showNotification('Agendamento realizado com sucesso!', 'success');
        
        if (form.id === 'bookingForm') {
            form.reset();
            this.setMinDate();
        } else {
            this.hideModal();
            this.renderAgendaView();
            this.loadDashboardData();
        }
    }
    
    // --- GERENCIAMENTO DE DADOS ---
    checkDataVersion() { const storedVersion = localStorage.getItem('barberpro_data_version'); if (storedVersion !== this.DATA_VERSION) { localStorage.clear(); localStorage.setItem('barberpro_data_version', this.DATA_VERSION); console.log('Versão de dados desatualizada. Limpando e restaurando padrões.'); } }
    getTodayDateString() { const today = new Date(); return today.toISOString().split('T')[0]; }
    saveToStorage(key, data) { localStorage.setItem(`barberpro_${key}`, JSON.stringify(data)); }
    getFromStorage(key, defaultValue) { try { const item = localStorage.getItem(`barberpro_${key}`); return item ? JSON.parse(item) : defaultValue; } catch { return defaultValue; } }
    
    loadData() {
        this.services = this.getFromStorage('services', [{ id: `s_default`, name: 'Corte Tradicional', price: 35, duration: 45, description: 'Corte clássico na tesoura e máquina.' }]);
        this.barbers = this.getFromStorage('barbers', [{ id: `b_default`, name: 'Fernandinho', specialty: 'Corte e Barba' }]);
        this.appointments = this.getFromStorage('appointments', []);
        this.clients = this.getFromStorage('clients', []);
        this.comandas = this.getFromStorage('comandas', []);
        this.caixa = this.getFromStorage('caixa', { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] });
        this.caixaHistory = this.getFromStorage('caixaHistory', []); // NOVO
        this.saveData();
        this.updateServiceDropdown();
        this.updateBarberDropdowns();
    }
    
    saveData() {
        this.saveToStorage('services', this.services);
        this.saveToStorage('barbers', this.barbers);
        this.saveToStorage('appointments', this.appointments);
        this.saveToStorage('clients', this.clients);
        this.saveToStorage('comandas', this.comandas);
        this.saveToStorage('caixa', this.caixa);
        this.saveToStorage('caixaHistory', this.caixaHistory); // NOVO
    }

    // --- AUTENTICAÇÃO ---
    checkAuthentication() { const token = this.getFromStorage('auth_token', null); if (token) { this.currentUser = token; this.showSection('barberDashboard'); this.loadDashboardData(); this.checkCaixaStatus(true); } else { this.showSection('barberLogin'); } }
    login(username, password) { if (username === 'barbeiro' && password === '123') { this.currentUser = { username: 'barbeiro', name: 'Barbeiro Pro' }; this.saveToStorage('auth_token', this.currentUser); this.showSection('barberDashboard'); this.switchDashboardView('dashboardView', true); this.showNotification('Login realizado com sucesso!', 'success'); this.loadDashboardData(); this.checkCaixaStatus(true); return true; } return false; }
    logout() { this.currentUser = null; localStorage.removeItem('barberpro_auth_token'); this.showSection('clientArea'); document.getElementById('clientAreaBtn')?.classList.add('active'); document.getElementById('barberAreaBtn')?.classList.remove('active'); this.showNotification('Você saiu da sua conta.'); }
    handleLoginSubmit() { const usernameEl = document.getElementById('username'); const passwordEl = document.getElementById('password'); if(usernameEl && passwordEl) { const username = usernameEl.value; const password = passwordEl.value; if (!this.login(username, password)) { this.showNotification('Usuário ou senha inválidos.', 'error'); } } }
    
    // --- DASHBOARD ---
    loadDashboardData() { if (!this.currentUser) return; this.updateCaixaStatusIndicator(); this.checkAndShowReminders(); this.updateStats(); this.renderDashboardAppointments(); this.renderRecentExpenses(); }
    updateStats() { const today = this.getTodayDateString(); const currentMonth = today.slice(0, 7); const todayAppointments = this.appointments.filter(a => a.date === today && (a.status === 'scheduled' || a.status === 'em_atendimento')); const todayRevenue = (this.caixa.entradas || []).filter(e => e.data.startsWith(today)).reduce((sum, e) => sum + e.valor, 0); const monthlyRevenue = this.appointments.filter(a => a.status === 'completed' && a.date.startsWith(currentMonth)).reduce((sum, a) => { const service = this.services.find(s => s.id === a.service); return sum + (service?.price || 0); }, 0); const openComandas = this.comandas.filter(c => c.status === 'aberta').length; const updateEl = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; }; updateEl('todayCount', todayAppointments.length); updateEl('openComandasCount', openComandas); updateEl('todayProfit', this.formatCurrency(todayRevenue)); updateEl('monthlyProfit', this.formatCurrency(monthlyRevenue)); updateEl('totalClientsCount', this.clients.length); const completedThisMonth = this.appointments.filter(a => a.date.startsWith(currentMonth) && a.status === 'completed'); updateEl('completedServicesCount', completedThisMonth.length); const averageTicket = completedThisMonth.length > 0 ? monthlyRevenue / completedThisMonth.length : 0; updateEl('averageTicket', this.formatCurrency(averageTicket)); const newClientsThisMonth = this.clients.filter(client => { const firstAppointment = this.appointments.find(a => a.phone === client.phone); return firstAppointment && firstAppointment.createdAt.startsWith(currentMonth); }).length; updateEl('newClientsCount', newClientsThisMonth); }
    
    // --- CAIXA (CASH REGISTER) - MELHORADO ---
    checkCaixaStatus(isInitialLoad = false) { if (this.caixa.status === 'fechado') { if (!isInitialLoad) { this.showNotification('O caixa está fechado. É preciso abri-lo para iniciar um atendimento.', 'error'); this.showAbrirCaixaModal(); } return false; } return true; }
    showAbrirCaixaModal() { if (this.caixa.status === 'aberto') { this.showNotification('O caixa já está aberto!', 'success'); return; } const content = ` <form id="openCaixaForm"> <p>Insira o valor inicial (suprimento/troco) para abrir o caixa.</p> <div class="form-group" style="margin-top: 1rem;"> <label>Valor Inicial (R$)</label> <input type="number" step="0.01" name="saldoInicial" placeholder="Ex: 50.00" required> </div> <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button> <button type="submit" class="btn-primary">Abrir Caixa</button> </div> </form> `; this.showModal('Abrir Caixa', content); document.getElementById('openCaixaForm')?.addEventListener('submit', e => { e.preventDefault(); const valor = parseFloat(e.target.querySelector('[name="saldoInicial"]').value); this.abrirCaixa(valor); }); }
    abrirCaixa(valorInicial) { this.caixa = { status: 'aberto', saldoInicial: valorInicial, abertura: new Date().toISOString(), entradas: [], saidas: [] }; this.saveData(); this.hideModal(); this.updateCaixaStatusIndicator(); this.renderFinancialPage(); this.showNotification(`Caixa aberto com ${this.formatCurrency(valorInicial)}!`, 'success'); }
    
    showFecharCaixaModal() {
        if (this.caixa.status === 'fechado') {
            this.showNotification('O caixa já está fechado.', 'error');
            return;
        }

        const totalsByMethod = this.caixa.entradas.reduce((acc, entrada) => {
            acc[entrada.metodo] = (acc[entrada.metodo] || 0) + entrada.valor;
            return acc;
        }, {});

        const totalEntradas = this.caixa.entradas.reduce((sum, item) => sum + item.valor, 0);
        const totalSaidas = this.caixa.saidas.reduce((sum, item) => sum + item.valor, 0);
        const dinheiroEntradas = totalsByMethod['Dinheiro'] || 0;
        const saldoEsperadoDinheiro = this.caixa.saldoInicial + dinheiroEntradas - totalSaidas;

        const methodsSummary = Object.entries(totalsByMethod).map(([metodo, valor]) =>
            `<div class="financial-item"><span>(+) ${metodo}:</span><span class="text-green">${this.formatCurrency(valor)}</span></div>`
        ).join('');

        const content = `
            <div class="financial-summary">
                <div class="financial-item"><span>Abertura:</span><span>${new Date(this.caixa.abertura).toLocaleTimeString('pt-BR')}</span></div>
                <div class="separator"></div>
                <div class="financial-item"><span>(+) Saldo Inicial:</span><span>${this.formatCurrency(this.caixa.saldoInicial)}</span></div>
                ${methodsSummary}
                <div class="financial-item"><span>(-) Saídas (Despesas):</span><span class="text-red">-${this.formatCurrency(totalSaidas)}</span></div>
                <div class="separator"></div>
                <div class="financial-item total"><span>(=) Saldo Esperado em Dinheiro:</span><strong id="saldoEsperado">${this.formatCurrency(saldoEsperadoDinheiro)}</strong></div>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Valor Conferido em Dinheiro</label>
                    <input type="number" step="0.01" id="countedCash" placeholder="Valor contado no caixa" class="form-control">
                </div>
                 <div class="financial-item total" id="diferencaCaixa" style="display:none;"><span>Diferença:</span><strong id="diferencaValor"></strong></div>
            </div>
            <div class="modal-footer" style="margin-top: 1rem;">
                <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                <button type="button" id="confirmCloseCaixaBtn" class="btn-primary btn-danger">Confirmar Fechamento</button>
            </div>`;
            
        this.showModal('Fechar Caixa', content, {width: '500px'});

        const countedCashInput = document.getElementById('countedCash');
        countedCashInput?.addEventListener('input', () => {
            const counted = parseFloat(countedCashInput.value) || 0;
            const difference = counted - saldoEsperadoDinheiro;
            const diffEl = document.getElementById('diferencaCaixa');
            const diffValorEl = document.getElementById('diferencaValor');
            if(!diffEl || !diffValorEl) return;
            diffValorEl.textContent = this.formatCurrency(difference);
            diffEl.style.display = 'flex';
            if (difference < 0) {
                diffValorEl.className = 'text-red';
            } else if (difference > 0) {
                diffValorEl.className = 'text-green';
            } else {
                 diffValorEl.className = '';
            }
        });

        document.getElementById('confirmCloseCaixaBtn')?.addEventListener('click', () => this.fecharCaixa());
    }

    fecharCaixa() {
        const countedCashInput = document.getElementById('countedCash');
        const countedCash = countedCashInput ? (parseFloat(countedCashInput.value) || 0) : 0;
        
        const totalsByMethod = this.caixa.entradas.reduce((acc, entrada) => {
            acc[entrada.metodo] = (acc[entrada.metodo] || 0) + entrada.valor;
            return acc;
        }, {});
        const totalEntradas = this.caixa.entradas.reduce((sum, item) => sum + item.valor, 0);
        const totalSaidas = this.caixa.saidas.reduce((sum, item) => sum + item.valor, 0);
        const dinheiroEntradas = totalsByMethod['Dinheiro'] || 0;
        const saldoEsperadoDinheiro = this.caixa.saldoInicial + dinheiroEntradas - totalSaidas;

        const closingSummary = {
            id: `caixa_${Date.now()}`,
            abertura: this.caixa.abertura,
            fechamento: new Date().toISOString(),
            saldoInicial: this.caixa.saldoInicial,
            entradas: this.caixa.entradas,
            saidas: this.caixa.saidas,
            totalEntradas: totalEntradas,
            entradasPorMetodo: totalsByMethod,
            totalSaidas: totalSaidas,
            saldoEsperadoDinheiro: saldoEsperadoDinheiro,
            dinheiroConferido: countedCash,
            diferenca: countedCash - saldoEsperadoDinheiro
        };

        this.caixaHistory.push(closingSummary);
        this.caixa = { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] }; // Reset
        this.saveData();
        this.hideModal();
        this.updateCaixaStatusIndicator();
        this.renderFinancialPage();
        this.showNotification('Caixa fechado e salvo no histórico com sucesso.', 'success');
    }

    showCaixaHistoryModal() {
        const historyItems = this.caixaHistory.sort((a, b) => new Date(b.fechamento) - new Date(a.fechamento)).map(item => {
            const differenceClass = item.diferenca < 0 ? 'text-red' : item.diferenca > 0 ? 'text-green' : '';
            return `
                <div class="history-item">
                    <span><strong>Fechamento:</strong> ${this.formatDateTime(item.fechamento)}</span>
                    <span><strong>Faturamento:</strong> ${this.formatCurrency(item.totalEntradas)}</span>
                    <span class="${differenceClass}"><strong>Diferença:</strong> ${this.formatCurrency(item.diferenca)}</span>
                </div>`;
        }).join('');

        const content = `
            <div class="history-list">
                ${this.caixaHistory.length > 0 ? historyItems : '<p class="empty-state">Nenhum fechamento de caixa anterior encontrado.</p>'}
            </div>
            <div class="modal-footer"><button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Fechar</button></div>`;
        
        this.showModal('Histórico de Fechamentos de Caixa', content);
    }
    
    updateCaixaStatusIndicator() { const indicator = document.getElementById('caixaStatus'); if (!indicator) return; if (this.caixa.status === 'aberto') { const total = this.caixa.saldoInicial + this.caixa.entradas.reduce((sum, i) => sum + i.valor, 0) - this.caixa.saidas.reduce((sum, i) => sum + i.valor, 0); indicator.className = 'caixa-status-indicator aberto'; indicator.innerHTML = `<span>Caixa Aberto: <strong>${this.formatCurrency(total)}</strong></span>`; } else { indicator.className = 'caixa-status-indicator fechado'; indicator.innerHTML = `<span>Caixa Fechado</span>`; } }
    
    // --- COMANDAS E PAGAMENTOS - MELHORADO ---
    abrirComanda(appointmentId) { if (!this.checkCaixaStatus()) return; const appointment = this.appointments.find(a => a.id === appointmentId); if (!appointment || appointment.status !== 'scheduled') { this.showNotification('Este agendamento não pode mais iniciar um atendimento.', 'error'); return; } const service = this.services.find(s => s.id === appointment.service); if (!service) { this.showNotification('Serviço não encontrado para este agendamento.', 'error'); return; } const newComanda = { id: `cmd-${Date.now()}`, appointmentId: appointment.id, clientName: appointment.name, clientPhone: appointment.phone, barberId: appointment.barberId, status: 'aberta', items: [{ id: service.id, name: service.name, price: service.price }], total: service.price, createdAt: new Date().toISOString() }; this.comandas.push(newComanda); appointment.status = 'em_atendimento'; this.saveData(); this.hideModal(); this.showNotification(`Comanda para ${appointment.name} aberta!`, 'success'); this.renderDashboardAppointments(); this.renderComandasView(); this.renderAgendaView(); this.switchDashboardView('comandasView'); }
    
    showPaymentModal(comandaId) {
        const comanda = this.comandas.find(c => c.id === comandaId);
        if (!comanda) return;

        const content = `
            <form id="paymentForm">
                <p>Recebendo pagamento de <strong>${comanda.clientName}</strong> no valor de <strong>${this.formatCurrency(comanda.total)}</strong>.</p>
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
                    <button type="submit" class="btn-primary">Confirmar Recebimento</button>
                </div>
            </form>
        `;
        this.showModal('Receber Pagamento', content);
        document.getElementById('paymentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const paymentMethod = e.target.querySelector('[name="paymentMethod"]').value;
            this.finalizePayment(comandaId, paymentMethod);
        });
    }

    finalizePayment(comandaId, paymentMethod) {
        const comanda = this.comandas.find(c => c.id === comandaId);
        if (!comanda) return;

        this.caixa.entradas.push({
            descricao: `Comanda ${comanda.clientName}`,
            valor: comanda.total,
            data: new Date().toISOString(),
            metodo: paymentMethod // Adicionado
        });

        comanda.status = 'paga';
        comanda.paymentMethod = paymentMethod;
        comanda.closedAt = new Date().toISOString();
        
        const appointment = this.appointments.find(a => a.id === comanda.appointmentId);
        if(appointment) { 
            appointment.status = 'completed'; 
        }

        this.saveData();
        this.hideModal();
        this.showNotification(`Pagamento de ${this.formatCurrency(comanda.total)} recebido via ${paymentMethod}!`, 'success');
        this.renderComandasView();
        this.loadDashboardData();
    }
    
    // --- MODAIS E RENDERIZAÇÃO ---
    renderDashboardAppointments() { const today = this.getTodayDateString(); const upcomingAppointments = this.appointments.filter(a => a.date >= today && a.status === 'scheduled').sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time)); const appointmentsListEl = document.getElementById('appointmentsList'); if(appointmentsListEl) appointmentsListEl.innerHTML = upcomingAppointments.length === 0 ? '<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhum agendamento futuro.</p></div>' : upcomingAppointments.map(a => this.createAppointmentCard(a)).join(''); const openComandas = this.comandas.filter(c => c.status === 'aberta').slice(0, 5); const dashboardComandasListEl = document.getElementById('dashboardComandasList'); if(dashboardComandasListEl) dashboardComandasListEl.innerHTML = openComandas.length === 0 ? '<div class="empty-state" style="padding:1rem"><p>Nenhuma comanda aberta</p></div>' : openComandas.map(c => `<div class="upcoming-item"><div><p><strong>${c.clientName}</strong></p><p class="text-muted">${c.items[0].name}</p></div><span>${this.formatCurrency(c.total)}</span></div>`).join(''); }
    renderComandasView() { const container = document.getElementById('comandasList'); if(!container) return; const openComandas = this.comandas.filter(c => c.status === 'aberta'); container.innerHTML = openComandas.length === 0 ? '<div class="empty-state"><div class="empty-icon">🧾</div><p>Nenhuma comanda em aberto.</p></div>' : openComandas.map(comanda => { const barber = this.barbers.find(b => b.id === comanda.barberId); return ` <div class="comanda-card"> <div class="appointment-header"> <div class="appointment-client"><h4>${comanda.clientName}</h4><p>${barber?.name || 'N/A'}</p></div> <div class="appointment-time"><span class="appointment-status status-aberta">Em Aberto</span></div> </div> <div class="appointment-footer"> <p class="appointment-service">${comanda.items.map(i => i.name).join(', ')} - <strong>${this.formatCurrency(comanda.total)}</strong></p> <div class="appointment-actions"> <button class="btn-primary btn-small" data-action="show-payment-modal" data-id="${comanda.id}">Receber Pagamento</button> </div> </div> </div>`; }).join(''); }
    renderServicesList() { const container = document.getElementById('servicesList'); if(!container) return; container.innerHTML = this.services.map(service => { const appointmentCount = this.appointments.filter(a => a.service === service.id).length; return `<div class="data-card"><div><strong>${service.name}</strong><div class="data-card-info"><span>💰 ${this.formatCurrency(service.price)}</span><span>⏳ ${service.duration} min</span><span>✂️ Realizado ${appointmentCount} vez(es)</span></div></div><div class="data-card-actions"><button class="btn-secondary btn-small" data-action="edit-service" data-id="${service.id}">Editar</button><button class="btn-secondary btn-danger btn-small" data-action="delete-service" data-id="${service.id}">Remover</button></div></div>` }).join('') || '<div class="empty-state"><p>Nenhum serviço cadastrado.</p></div>'; }
    renderProfessionalsList() { const container = document.getElementById('professionalsList'); if(!container) return; container.innerHTML = this.barbers.map(barber => { const appointmentCount = this.appointments.filter(a => a.barberId === barber.id).length; return `<div class="data-card"><div><strong>${barber.name}</strong><div class="data-card-info"><span>💈 ${barber.specialty || ''}</span><span>📅 ${appointmentCount} agendamentos</span></div></div><div class="data-card-actions"><button class="btn-secondary btn-small" data-action="edit-professional" data-id="${barber.id}">Editar</button><button class="btn-secondary btn-danger btn-small" data-action="delete-professional" data-id="${barber.id}">Remover</button></div></div>`; }).join('') || '<div class="empty-state"><p>Nenhum profissional cadastrado.</p></div>'; }
    renderFinancialPage() { const container = document.getElementById('financialDashboard'); if(!container) return; if (this.caixa.status === 'fechado') { container.innerHTML = '<div class="empty-state" style="padding: 2rem;"><div class="empty-icon">💰</div><p>O caixa está fechado. Abra-o para ver os detalhes financeiros do dia.</p></div>'; return; } const totalEntradas = this.caixa.entradas.reduce((sum, item) => sum + item.valor, 0); const totalSaidas = this.caixa.saidas.reduce((sum, item) => sum + item.valor, 0); const saldoAtual = this.caixa.saldoInicial + totalEntradas - totalSaidas; container.innerHTML = ` <div class="financial-item"><span>Status do Caixa:</span> <span class="text-green">Aberto</span></div> <div class="financial-item"><span>Saldo Inicial:</span> <span>${this.formatCurrency(this.caixa.saldoInicial)}</span></div> <div class="separator"></div> <div class="financial-item"><span>Total de Entradas:</span> <span class="text-green">+ ${this.formatCurrency(totalEntradas)}</span></div> <div class="financial-item"><span>Total de Saídas:</span> <span class="text-red">- ${this.formatCurrency(totalSaidas)}</span></div> <div class="separator"></div> <div class="financial-item total"><span>Saldo Atual em Caixa:</span> <span>${this.formatCurrency(saldoAtual)}</span></div> `; }

    renderAgendaView() {
        const container = document.getElementById('agendaViewContainer');
        const dateFilter = document.getElementById('agendaDateFilter');
        if (!container || !dateFilter) return;
        const selectedDate = dateFilter.value || this.getTodayDateString();
        const timeSlots = Array.from({length: (19-9)*4}, (_, i) => {
            const hour = 9 + Math.floor(i/4);
            const minute = (i % 4) * 15;
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        });

        let timeColumnHTML = '<div class="agenda-time-column">' + timeSlots.map(time => `<div class="agenda-time-slot">${time.endsWith(':00') ? time : ''}</div>`).join('') + '</div>';
        
        let barbersAreaHTML = `<div class="agenda-barbers-area" style="grid-template-columns: repeat(${this.barbers.length}, 1fr);">
`;
        this.barbers.forEach(barber => {
            barbersAreaHTML += `<div class="agenda-barber-column"><div class="agenda-barber-header">${barber.name}</div><div class="agenda-slots-container">
`;
            const barberAppointments = this.appointments.filter(a => a.barberId === barber.id && a.date === selectedDate && (a.status === 'scheduled' || a.status === 'em_atendimento'));
            barberAppointments.forEach(app => {
                const service = this.services.find(s => s.id === app.service);
                if (!service) return;
                const [startHour, startMinute] = app.time.split(':').map(Number);
                const totalMinutesFrom9AM = (startHour - 9) * 60 + startMinute;
                const topPosition = totalMinutesFrom9AM;
                const height = service.duration || 60;
                const blockClass = app.status === 'em_atendimento' ? 'status-em_atendimento' : '';
                barbersAreaHTML += `<div class="agenda-appointment-block ${blockClass}" data-appointment-id="${app.id}" style="top: ${topPosition}px; height: ${height}px;"><p class="appointment-block-name">${app.name}</p><p class="appointment-block-service">${service.name}</p></div>`;
            });
            barbersAreaHTML += `</div></div>`;
        });
        barbersAreaHTML += `</div>`;
        container.innerHTML = timeColumnHTML + barbersAreaHTML;

        container.querySelectorAll('.agenda-appointment-block').forEach(block => {
            block.addEventListener('click', (e) => {
                const appointmentId = e.currentTarget.dataset.appointmentId;
                this.showAppointmentDetailsModal(appointmentId);
            });
        });
    }

    showAppointmentDetailsModal(appointmentId) {
        const appointment = this.appointments.find(a => a.id === appointmentId);
        if (!appointment) return;
        const service = this.services.find(s => s.id === appointment.service);
        const barber = this.barbers.find(b => b.id === appointment.barberId);
        const content = `
            <div class="appointment-details">
                <p><strong>Cliente:</strong> ${appointment.name}</p>
                <p><strong>Telefone:</strong> ${appointment.phone}</p>
                <p><strong>Serviço:</strong> ${service ? `${service.name} (${this.formatCurrency(service.price)})` : 'N/A'}</p>
                <p><strong>Profissional:</strong> ${barber ? barber.name : 'N/A'}</p>
                <p><strong>Horário:</strong> ${this.formatDate(appointment.date)} às ${appointment.time}</p>
                <p><strong>Status:</strong> <span class="appointment-status status-${appointment.status}">${appointment.status.replace('_', ' ')}</span></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Fechar</button>
                ${appointment.status === 'scheduled' ? `<button type="button" class="btn-primary" data-action="abrir-comanda" data-id="${appointment.id}">Abrir Comanda</button>` : ''}
            </div>`;
        this.showModal('Detalhes do Agendamento', content);
    }
    
    showModal(title, content, options = {}) { const modalTitleEl = document.getElementById('modalTitle'); const modalContentEl = document.getElementById('modalContent'); const modalBackdropEl = document.getElementById('modalBackdrop'); const modalContainerEl = document.getElementById('modalContainer'); if(modalTitleEl) modalTitleEl.textContent = title; if(modalContentEl) modalContentEl.innerHTML = content; if(modalBackdropEl) modalBackdropEl.style.display = 'flex'; if(modalContainerEl) modalContainerEl.style.maxWidth = options.width || '600px'; }
    hideModal() { const modalBackdropEl = document.getElementById('modalBackdrop'); if (modalBackdropEl) modalBackdropEl.style.display = 'none'; }
    showNotification(message, type = 'success') { const container = document.getElementById('notificationContainer'); if (!container) return; const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; container.appendChild(notification); setTimeout(() => { notification.remove(); }, 4000); }
    
    createAppointmentCard(appointment) { const service = this.services.find(s => s.id === appointment.service); const barber = this.barbers.find(b => b.id === appointment.barberId); const statusMap = { scheduled: { text: 'Agendado', class: 'status-scheduled' }, completed: { text: 'Finalizado', class: 'status-completed' }, cancelled: { text: 'Cancelado', class: 'status-cancelled' }, em_atendimento: { text: 'Em Atendimento', class: 'status-em_atendimento'} }; const status = statusMap[appointment.status] || statusMap.scheduled; let actionButton = ''; if (appointment.status === 'scheduled') { actionButton = `<button class="btn-primary btn-small" data-action="abrir-comanda" data-id="${appointment.id}">Abrir Comanda</button>`; } return ` <div class="appointment-card ${appointment.status !== 'scheduled' ? 'opacity-60' : ''}"> <div class="appointment-header"> <div class="appointment-client"><h4>${appointment.name}</h4><p>${this.formatDate(appointment.date)} - ${appointment.time}h</p></div> <div class="appointment-time"><p>${barber?.name || 'N/A'}</p><span class="appointment-status ${status.class}">${status.text}</span></div> </div> <div class="appointment-footer"> <p class="appointment-service">${service?.name || 'Serviço'} - <strong>${this.formatCurrency(service?.price || 0)}</strong></p> <div class="appointment-actions">${actionButton}</div> </div> </div>`; }
    updateServiceDropdown() { const serviceSelects = document.querySelectorAll('select[name="service"]'); const sortedServices = [...this.services].sort((a,b) => a.name.localeCompare(b.name)); let optionsHTML = '<option value="">Selecione o serviço</option>' + sortedServices.map(s => `<option value="${s.id}" data-price="${s.price || 0}">${s.name} - ${this.formatCurrency(s.price || 0)}</option>`).join(''); serviceSelects.forEach(select => { select.innerHTML = optionsHTML; }); }
    updateBarberDropdowns() { const barberSelects = document.querySelectorAll('select[name="barber"]'); const sortedBarbers = [...this.barbers].sort((a, b) => a.name.localeCompare(b.name)); let optionsHTML = '<option value="">Selecione o profissional</option>' + sortedBarbers.map(b => `<option value="${b.id}">${b.name}</option>`).join(''); barberSelects.forEach(select => { select.innerHTML = optionsHTML; }); }
    showServiceModal(id = null) { const service = id ? this.services.find(s => s.id === id) : {}; const content = ` <form id="serviceForm"> <input type="hidden" name="id" value="${service.id || ''}"> <div class="form-group"><label>Nome do Serviço</label><input type="text" name="name" value="${service.name || ''}" required></div> <div class="form-group"><label>Preço (R$)</label><input type="number" step="0.01" name="price" value="${service.price || ''}" required></div> <div class="form-group"><label>Duração (minutos)</label><input type="number" step="15" name="duration" value="${service.duration || '45'}" required></div> <div class="form-group"><label>Descrição</label><input type="text" name="description" value="${service.description || ''}"></div> <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button> <button type="submit" class="btn-primary">${service.id ? 'Salvar' : 'Adicionar'}</button> </div> </form>`; this.showModal(service.id ? 'Editar Serviço' : 'Adicionar Serviço', content); document.getElementById('serviceForm')?.addEventListener('submit', e => { e.preventDefault(); const formData = new FormData(e.target); const serviceData = { id: formData.get('id'), name: formData.get('name'), price: parseFloat(formData.get('price')), duration: parseInt(formData.get('duration')), description: formData.get('description') }; this.saveService(serviceData); }); }
    resetTestData() { if (confirm('ATENÇÃO!

Isto irá apagar TODOS os agendamentos, comandas, clientes e dados financeiros, INCLUINDO O HISTÓRICO. Serviços e profissionais serão mantidos.

Deseja continuar?')) { this.appointments = []; this.clients = []; this.comandas = []; this.caixa = { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] }; this.caixaHistory = []; this.saveData(); this.loadDashboardData(); this.switchDashboardView('dashboardView'); this.showNotification('Dados de teste foram zerados.', 'success'); } }
    formatCurrency(value) { if (typeof value !== 'number') return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
    formatDate(dateString) { const date = new Date(dateString); return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
    formatDateTime(dateString) { const date = new Date(dateString); return date.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}); }
    sanitizePhone(phone) { return phone.replace(/[^0-9]/g, ''); }
    
    // --- Funções de CRUD e Modais Adicionais ---
    showProfessionalModal(id = null) {
        const professional = id ? this.barbers.find(b => b.id === id) : {};
        const content = `
            <form id="professionalForm">
                <input type="hidden" name="id" value="${professional.id || ''}">
                <div class="form-group">
                    <label>Nome do Profissional</label>
                    <input type="text" name="name" value="${professional.name || ''}" placeholder="Nome completo" required>
                </div>
                <div class="form-group">
                    <label>Especialidade</label>
                    <input type="text" name="specialty" value="${professional.specialty || ''}" placeholder="Ex: Corte, Barba, Química">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">${id ? 'Salvar Alterações' : 'Adicionar Profissional'}</button>
                </div>
            </form>
        `;
        this.showModal(id ? 'Editar Profissional' : 'Adicionar Profissional', content);
        document.getElementById('professionalForm')?.addEventListener('submit', e => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const professionalData = {
                id: formData.get('id'),
                name: formData.get('name').trim(),
                specialty: formData.get('specialty').trim()
            };
            this.saveProfessional(professionalData);
        });
    }

    showClientDetailModal(phone) {
        const client = this.clients.find(c => c.phone === phone);
        if (!client) {
            this.showNotification('Cliente não encontrado.', 'error');
            return;
        }

        const clientAppointments = this.appointments
            .filter(a => a.phone === phone)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalSpent = clientAppointments
            .filter(a => a.status === 'completed')
            .reduce((sum, a) => {
                const service = this.services.find(s => s.id === a.service);
                return sum + (service?.price || 0);
            }, 0);

        const historyHTML = clientAppointments.length > 0 ? clientAppointments.map(a => {
            const service = this.services.find(s => s.id === a.service);
            const statusMap = { scheduled: 'Agendado', completed: 'Finalizado', cancelled: 'Cancelado', em_atendimento: 'Em Atendimento' };
            return `<div class="history-item">
                        <span>${this.formatDate(a.date)} - ${service?.name || 'Serviço desconhecido'}</span>
                        <span>${this.formatCurrency(service?.price || 0)}</span>
                        <span class="appointment-status status-${a.status}">${statusMap[a.status] || a.status}</span>
                    </div>`;
        }).join('') : '<p class="empty-state" style="padding: 1rem 0;">Nenhum histórico de agendamento.</p>';

        const content = `
            <div class="client-details">
                <h4>${client.name}</h4>
                <p><strong>Telefone:</strong> ${client.phone}</p>
                <div class="separator" style="margin: 1rem 0;"></div>
                <p><strong>Total Gasto:</strong> ${this.formatCurrency(totalSpent)}</p>
                <p><strong>Total de Visitas:</strong> ${clientAppointments.length}</p>
                <div class="separator" style="margin: 1rem 0;"></div>
                <h5>Histórico de Agendamentos</h5>
                <div class="history-list" style="margin-top: 1rem;">${historyHTML}</div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Fechar</button>
            </div>
        `;
        this.showModal('Detalhes do Cliente', content);
    }

    showNewComandaModal() {
        if (!this.checkCaixaStatus()) return;

        const serviceOptions = this.services.map(s => `<option value="${s.id}" data-price="${s.price}">${s.name} - ${this.formatCurrency(s.price)}</option>`).join('');
        const barberOptions = this.barbers.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

        const content = `
            <form id="newComandaForm">
                <p>Crie uma comanda para um cliente que não possui agendamento prévio.</p>
                <div class="form-group">
                    <label>Nome do cliente</label>
                    <input type="text" name="clientName" placeholder="Nome do cliente (para novo)" required>
                </div>
                <div class="form-group">
                    <label>Telefone do Cliente</label>
                    <input type="tel" name="clientPhone" placeholder="Telefone (apenas números com DDD)" required>
                </div>
                <div class="form-group">
                    <label>Serviço</label>
                    <select name="service" required>
                        <option value="">Selecione o serviço</option>
                        ${serviceOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Profissional</label>
                    <select name="barber" required>
                        <option value="">Selecione o profissional</option>
                        ${barberOptions}
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Abrir Comanda</button>
                </div>
            </form>
        `;
        this.showModal('Nova Comanda Avulsa', content);

        document.getElementById('newComandaForm')?.addEventListener('submit', e => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const serviceId = formData.get('service');
            const service = this.services.find(s => s.id === serviceId);
            const clientPhone = this.sanitizePhone(formData.get('clientPhone'));
            const clientName = formData.get('clientName').trim();

            if (!clientName || !clientPhone || !service || !formData.get('barber')) {
                this.showNotification('Todos os campos são obrigatórios.', 'error');
                return;
            }

            this.getOrUpdateClient(clientPhone, clientName);

            const newComanda = {
                id: `cmd-${Date.now()}`,
                appointmentId: null,
                clientName: clientName,
                clientPhone: clientPhone,
                barberId: formData.get('barber'),
                status: 'aberta',
                items: [{ id: service.id, name: service.name, price: service.price }],
                total: service.price,
                createdAt: new Date().toISOString()
            };

            this.comandas.push(newComanda);
            this.saveData();
            this.hideModal();
            this.showNotification(`Comanda para ${clientName} aberta!`, 'success');
            this.renderComandasView();
            this.loadDashboardData();
        });
    }

    deleteService(id) {
        if (this.services.length <= 1) {
            this.showNotification('É necessário ter pelo menos um serviço cadastrado.', 'error');
            return;
        }
        if (confirm('Tem certeza que deseja remover este serviço?')) {
            this.services = this.services.filter(s => s.id !== id);
            this.saveData();
            this.renderServicesList();
            this.updateServiceDropdown();
            this.renderClientServices();
            this.showNotification('Serviço removido.');
        }
    }

    saveProfessional(professionalData) { if (!professionalData.name || professionalData.name.trim() === '') { this.showNotification('O nome do profissional é obrigatório.', 'error'); return; } const existingProfessional = this.barbers.find(b => b.name.toLowerCase() === professionalData.name.toLowerCase() && b.id !== professionalData.id); if (existingProfessional) { this.showNotification('Já existe um profissional com este nome.', 'error'); return; } if (professionalData.id) { const index = this.barbers.findIndex(b => b.id === professionalData.id); if (index > -1) { this.barbers[index] = { ...this.barbers[index], ...professionalData }; } } else { this.barbers.push({ id: `b_${Date.now()}`, ...professionalData }); } this.saveData(); this.hideModal(); this.renderProfessionalsList(); this.updateBarberDropdowns(); this.renderClientBarbers(); this.showNotification('Profissional salvo com sucesso!', 'success'); }
    deleteProfessional(id) { if (this.barbers.length <= 1) { this.showNotification('É necessário ter pelo menos um profissional cadastrado.', 'error'); return; } if (confirm('Tem certeza que deseja remover este profissional?')) { this.barbers = this.barbers.filter(b => b.id !== id); this.saveData(); this.renderProfessionalsList(); this.updateBarberDropdowns(); this.renderClientBarbers(); this.showNotification('Profissional removido.'); } }
    saveExpense(expenseData) { if (!this.checkCaixaStatus()) return; this.caixa.saidas.push({ descricao: expenseData.description, valor: expenseData.amount, data: new Date().toISOString() }); this.saveData(); this.hideModal(); this.loadDashboardData(); if (document.getElementById('financialView')?.style.display === 'block') { this.renderFinancialPage(); } this.showNotification('Despesa registrada com sucesso!', 'success'); }
    setMinDate() { const dateInput = document.getElementById('preferredDate'); if (dateInput) dateInput.min = this.getTodayDateString(); }
    showExpenseModal() { if (!this.checkCaixaStatus()) return; const content = ` <form id="expenseForm"> <div class="form-group"><label>Descrição</label><input type="text" name="description" placeholder="Ex: Compra de lâminas" required></div> <div class="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="amount" required></div> <div class="modal-footer"> <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button> <button type="submit" class="btn-primary">Adicionar Despesa</button> </div> </form>`; this.showModal('Adicionar Nova Despesa', content); document.getElementById('expenseForm')?.addEventListener('submit', e => { e.preventDefault(); const formData = new FormData(e.target); const expenseData = { description: formData.get('description'), amount: parseFloat(formData.get('amount')) }; if (expenseData.description && expenseData.amount > 0) { this.saveExpense(expenseData); } else { this.showNotification('Por favor, preencha todos os campos da despesa.', 'error'); } }); }
    cancelAppointment(id) { if (confirm('Tem certeza que deseja cancelar este agendamento?')) { const appointment = this.appointments.find(a => a.id === id); if (appointment) { appointment.status = 'cancelled'; this.saveData(); this.loadDashboardData(); this.renderAgendaView(); this.showNotification('Agendamento cancelado.'); } } }
    showAppointmentModal() { const clientSuggestionsEl = document.getElementById('clientSuggestions'); if(clientSuggestionsEl) clientSuggestionsEl.innerHTML = this.clients.map(c => `<option value="${c.name}"></option>`).join(''); const serviceOptions = this.services.map(s => `<option value="${s.id}">${s.name} - ${this.formatCurrency(s.price)}</option>`).join(''); const barberOptions = this.barbers.map(b => `<option value="${b.id}">${b.name}</option>`).join(''); const timeOptions = []; for (let h = 9; h < 19; h++) { for (let m = 0; m < 60; m += 15) { if (h >= 12 && h < 14) continue; const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; timeOptions.push(`<option value="${time}">${time}</option>`); } } const agendaDateFilterValue = document.getElementById('agendaDateFilter')?.value || this.getTodayDateString(); const content = ` <form id="barberBookingForm"> <div class="form-group"><label>Cliente</label><input type="text" name="name" list="clientSuggestions" placeholder="Digite para buscar ou cadastrar novo" required></div> <div class="form-group"><label>Celular (com DDD)</label><input type="tel" name="phone" placeholder="11999999999" required></div> <div class="form-group"><label>Serviço</label><select name="service" required><option value="">Selecione</option>${serviceOptions}</select></div> <div class="form-group"><label>Profissional</label><select name="barber" required><option value="">Selecione</option>${barberOptions}</select></div> <div class="form-group"><label>Data</label><input type="date" name="date" value="${agendaDateFilterValue}" required></div> <div class="form-group"><label>Horário</label><select name="time" required><option value="">Selecione</option>${timeOptions.join('')}</select></div> <div class="modal-footer">
 <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
 <button type="submit" class="btn-primary">Confirmar Agendamento</button>
 </div> </form>`; this.showModal('Novo Agendamento', content); const form = document.getElementById('barberBookingForm'); if(!form) return; const nameInput = form.querySelector('[name="name"]'); const phoneInput = form.querySelector('[name="phone"]'); nameInput?.addEventListener('change', () => { const existingClient = this.clients.find(c => c.name === nameInput.value); if (existingClient) { phoneInput.value = existingClient.phone; } }); form.addEventListener('submit', e => { e.preventDefault(); this.handleAppointmentSubmit(e.target); }); }
    checkAndShowReminders() { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); const tomorrowDateString = tomorrow.toISOString().split('T')[0]; const appointmentsToRemind = this.appointments.filter(a => a.date === tomorrowDateString && !a.reminderSent && a.status === 'scheduled'); if (appointmentsToRemind.length > 0) { this.showReminderModal(appointmentsToRemind); } }
    showReminderModal(appointments) { const reminderItems = appointments.map(app => { const service = this.services.find(s => s.id === app.service); const phoneWithCountryCode = `55${this.sanitizePhone(app.phone)}`; const message = encodeURIComponent(`Olá ${app.name}! Passando para confirmar seu agendamento para "${service?.name}" amanhã, dia ${this.formatDate(app.date)} às ${app.time}. Por favor, responda com 'SIM' para confirmar. Obrigado!`); const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${message}`; return `<div class="reminder-item"><div class="reminder-item-info"><p><strong>${app.name}</strong></p><p class="time">${app.time}</p></div><a href="${whatsappUrl}" target="_blank" class="btn-secondary btn-small" data-action="send-reminder" data-id="${app.id}">Lembrar via WhatsApp</a></div>`; }).join(''); const content = `<p>Os clientes abaixo têm agendamentos para amanhã. Clique para enviar um lembrete.</p><div class="reminder-list">${reminderItems}</div><div class="modal-footer"><button type="button" class="btn-primary" onclick="window.barberPro.saveAndCloseReminderModal()">Concluir e Salvar</button></div>`; this.showModal('Lembretes para Amanhã', content); }
    markReminderAsSent(buttonElement, appointmentId) { const appointment = this.appointments.find(a => a.id === appointmentId); if (appointment) appointment.reminderSent = true; buttonElement.textContent = 'Enviado'; buttonElement.classList.add('btn-disabled'); buttonElement.removeAttribute('href'); buttonElement.onclick = (e) => e.preventDefault(); }
    saveAndCloseReminderModal() { this.saveData(); this.hideModal(); this.showNotification('Lembretes marcados como enviados!', 'success'); }

    navigateAgendaDays(direction) { const dateInput = document.getElementById('agendaDateFilter'); if (!dateInput) return; try { const currentDate = new Date(dateInput.value + 'T00:00:00'); if (isNaN(currentDate.getTime())) { dateInput.value = this.getTodayDateString(); return; } currentDate.setDate(currentDate.getDate() + direction); dateInput.value = currentDate.toISOString().split('T')[0]; this.renderAgendaView(); } catch (e) { console.error('Erro ao navegar entre datas:', e); dateInput.value = this.getTodayDateString(); } }
    renderClientServices() { const container = document.getElementById('services-showcase-list'); if (!container) return; container.innerHTML = this.services.map(service => ` <div class="service-card glass-card"> <h4>${service.name}</h4> <p class="service-price">${this.formatCurrency(service.price)}</p> <p class="service-description">${service.description || ''}</p> </div> `).join(''); }
    renderClientBarbers() { const container = document.getElementById('barbers-showcase-list'); if (!container) return; container.innerHTML = this.barbers.map(barber => ` <div class="barber-card glass-card"> <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=c7a355&color=fff&size=128" alt="Barbeiro ${barber.name}"> <h4>${barber.name}</h4> <p class="barber-specialty">${barber.specialty || 'Especialista'}</p> </div> `).join(''); }
    renderRecentExpenses() { const container = document.getElementById('recentExpensesList'); if(!container) return; const recentExpenses = this.caixa.saidas.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 3); container.innerHTML = recentExpenses.length === 0 ? '<div class="empty-state" style="padding:1rem"><p>Nenhuma despesa recente</p></div>' : recentExpenses.map(expense => ` <div class="expense-item"> <p>${expense.descricao}</p> <p class="expense-amount">- ${this.formatCurrency(expense.valor)}</p> </div> `).join(''); }
    renderFullClientsList() { const container = document.getElementById('fullClientsList'); const searchInput = document.getElementById('clientSearchInput'); if(!container || !searchInput) return; const searchTerm = searchInput.value.toLowerCase(); const clients = this.clients.filter(c => c.name.toLowerCase().includes(searchTerm) || c.phone.includes(searchTerm)).sort((a,b) => a.name.localeCompare(b.name)); container.innerHTML = clients.length === 0 ? '<div class="empty-state"><p>Nenhum cliente encontrado.</p></div>' : clients.map(client => { const clientAppointments = this.appointments.filter(a => a.phone === client.phone); const totalVisits = clientAppointments.length; const lastVisit = totalVisits > 0 ? clientAppointments.sort((a,b) => b.date.localeCompare(a.date))[0].date : 'N/A'; return `<div class="data-card"><div><strong>${client.name}</strong><div class="data-card-info"><span>📞 ${client.phone}</span><span>📅 Visitas: ${totalVisits}</span><span>📍 Última Visita: ${lastVisit !== 'N/A' ? this.formatDate(lastVisit) : lastVisit}</span></div></div><div class="data-card-actions"><button class="btn-secondary btn-small" data-action="view-client-details" data-id="${client.phone}">Ver Detalhes</button></div></div>`; }).join(''); }
    renderCharts() { Object.values(this.charts).forEach(chart => chart?.destroy()); if(typeof Chart === 'undefined' || typeof ChartDataLabels === 'undefined') return; Chart.register(ChartDataLabels); const revenueCtxEl = document.getElementById('revenueChart'); if(revenueCtxEl) { const revenueCtx = revenueCtxEl.getContext('2d'); const weeklyData = { labels: [], data: [] }; for (let i = 6; i >= 0; i--) { const date = new Date(); date.setDate(date.getDate() - i); const dateStr = date.toISOString().split('T')[0]; weeklyData.labels.push(date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })); const dailyRevenue = this.appointments.filter(a => a.date === dateStr && a.status === 'completed').reduce((sum, a) => { const service = this.services.find(s => s.id === a.service); return sum + (service ? service.price : 0); }, 0); weeklyData.data.push(dailyRevenue); } this.charts.revenueChart = new Chart(revenueCtx, { type: 'bar', data: { labels: weeklyData.labels, datasets: [{ label: 'Faturamento Diário', data: weeklyData.data, backgroundColor: 'rgba(199, 163, 85, 0.7)' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } }); } const servicesCtxEl = document.getElementById('servicesChart'); if(servicesCtxEl) { const servicesCtx = servicesCtxEl.getContext('2d'); const serviceAnalytics = this.services.map(s => { const appointments = this.appointments.filter(a => a.service === s.id && a.status === 'completed'); return { name: s.name, count: appointments.length, revenue: appointments.length * s.price }; }).filter(s => s.count > 0).sort((a, b) => b.revenue - a.revenue); this.charts.servicesChart = new Chart(servicesCtx, { type: 'bar', data: { labels: serviceAnalytics.map(s => s.name), datasets: [{ label: 'Faturamento por Serviço', data: serviceAnalytics.map(s => s.revenue), backgroundColor: 'rgba(59, 130, 246, 0.7)' }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } } } }); } }
}

// Inicia a aplicação
window.barberPro = new BarberPro();

// Utility function to get or create a client
BarberPro.prototype.getOrUpdateClient = function(phone, name) {
  let client = this.clients.find(c => c.phone === phone);
  if (client) {
    if (client.name !== name) {
      client.name = name; // Update name if it's different
    }
  } else {
    client = {
      phone: phone,
      name: name,
      createdAt: new Date().toISOString()
    };
    this.clients.push(client);
  }
  return client;
};
