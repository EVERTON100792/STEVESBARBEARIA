class BarberPro {
            constructor() {
                this.bookingState = {};
                this.currentUser = null;
                this.charts = {};
                this.DATA_VERSION = '6.8'; // Version updated
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

            setupGlobalEventListeners() {
                document.body.addEventListener('click', e => {
                    const actionTarget = e.target.closest('[data-action]');
                    if (actionTarget) {
                        e.preventDefault();
                        this.handleActionClick(actionTarget.dataset.action, actionTarget.dataset.id);
                        return;
                    }
                    const buttonTarget = e.target.closest('button');
                    if (buttonTarget) {
                        const buttonId = buttonTarget.id;
                        switch (buttonId) {
                            case 'backToServicesBtn': this.resetBookingFlow(); break;
                            case 'sidebarToggle': case 'closeSidebarBtn': document.body.classList.toggle('sidebar-is-open'); break;
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
                            case 'addAppointmentBtn': case 'quickAddAppointmentBtn': this.showAppointmentModal(true); break;
                            case 'addWalkInBtn': this.showAppointmentModal(false); break;
                            case 'welcomeOpenCaixaBtn': case 'openCaixaBtn': this.showAbrirCaixaModal(); break;
                            case 'closeCaixaBtn': this.showFecharCaixaModal(); break;
                            case 'viewHistoryBtn': this.showCaixaHistoryModal(); break;
                            case 'addExpenseBtnMain': this.showExpenseModal(); break;
                            case 'closeModalBtn': this.hideModal(); break;
                        }
                    }
                    const navItem = e.target.closest('.sidebar-nav .nav-item:not(.nav-parent)');
                    if (navItem) {
                        e.preventDefault();
                        this.switchDashboardView(navItem.dataset.view);
                    }
                    const navParent = e.target.closest('.nav-parent');
                    if (navParent) {
                        e.preventDefault();
                        const parentGroup = navParent.closest('.nav-group');
                        if (!parentGroup) return;
                        const submenu = parentGroup.querySelector('.nav-submenu');
                        if (!submenu) return;
                        parentGroup.classList.toggle('open');
                        submenu.style.maxHeight = parentGroup.classList.contains('open') ? submenu.scrollHeight + "px" : null;
                    }
                });

                document.body.addEventListener('submit', e => {
                    e.preventDefault();
                    const form = e.target;
                    const submitButton = document.querySelector(`button[type="submit"][form="${form.id}"]`) || form.querySelector('button[type="submit"]');

                    if (submitButton) {
                        submitButton.disabled = true;
                        setTimeout(() => {
                            if (submitButton) submitButton.disabled = false;
                        }, 1000);
                    }

                    switch (form.id) {
                        case 'clientDetailsForm': this.handleClientBookingConfirmation(e); break;
                        case 'barberBookingForm': this.handleAppointmentSubmit(new FormData(form), form.dataset.walkIn === 'true'); break;
                        case 'loginForm': this.handleLoginSubmit(form); break;
                        
                        
                        case 'expenseForm': this.saveExpense(new FormData(form)); break;
                        case 'openCaixaForm': this.abrirCaixa(this.parseCurrency(new FormData(form).get('initialValue'))); break;
                        case 'closeCaixaForm': this.fecharCaixa(this.parseCurrency(new FormData(form).get('countedCash'))); break;
                    }
                });

                document.body.addEventListener('input', e => {
                    if (e.target.id === 'clientSearchInput') this.renderFullClientsList();
                    if (e.target.matches('#barberBookingForm input[name="name"]')) this.handleClientNameInput(e); 
                    if (e.target.id === 'serviceSearchInput') this.renderClientView();
                    if (e.target.id === 'agendaDateFilter') this.renderAgendaView();
                });

                document.getElementById('sidebarOverlay')?.addEventListener('click', () => document.body.classList.remove('sidebar-is-open'));
                document.getElementById('modalBackdrop')?.addEventListener('click', e => {
                    if (e.target.id === 'modalBackdrop') this.hideModal();
                });
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

            checkDataVersion() {
                if (localStorage.getItem('barberpro_data_version') !== this.DATA_VERSION) {
                    localStorage.clear();
                    localStorage.setItem('barberpro_data_version', this.DATA_VERSION);
                }
            }

            loadData() {
                this.services = this.getFromStorage('services', [{
                    id: `s_1`,
                    name: 'Corte Degrade',
                    price: 42,
                    duration: 45,
                    description: 'Corte moderno com efeito degradê.',
                    imageUrl: 'https://images.unsplash.com/photo-1616099395914-27361865c32b?w=80&h=80&fit=crop&q=80'
                }, { 
                    id: `s_2`,
                    name: 'Barba',
                    price: 32,
                    duration: 30,
                    description: 'Modelagem e aparo da barba.',
                    imageUrl: 'https://images.unsplash.com/photo-1622288432454-20b171d33306?w=80&h=80&fit=crop&q=80'
                }, { 
                    id: `s_3`,
                    name: 'Corte Social',
                    price: 34,
                    duration: 30,
                    description: 'Corte clássico na tesoura e máquina.',
                    imageUrl: 'https://images.unsplash.com/photo-1599335593362-e67b2a3a5f45?w=80&h=80&fit=crop&q=80'
                }, { 
                    id: `s_4`,
                    name: 'Barboterapia',
                    price: 45,
                    duration: 30,
                    description: 'Barba com toalha quente e massagem.',
                    imageUrl: 'https://images.unsplash.com/photo-1532710093739-942318a17684?w=80&h=80&fit=crop&q=80'
                }]);
                this.barbers = this.getFromStorage('barbers', [{
                    id: `b_1`,
                    name: 'Hernani',
                    specialty: 'Corte e Barba'
                }, { 
                    id: `b_2`,
                    name: 'Fernandinho',
                    specialty: 'Degradê'
                }]);
                this.appointments = this.getFromStorage('appointments', []);
                this.clients = this.getFromStorage('clients', []);
                this.caixa = this.getFromStorage('caixa', {
                    status: 'fechado',
                    saldoInicial: 0,
                    abertura: null,
                    entradas: [],
                    saidas: []
                });
                this.caixaHistory = this.getFromStorage('caixaHistory', []);
            }

            saveData() {
                this.saveToStorage('services', this.services);
                this.saveToStorage('barbers', this.barbers);
                this.saveToStorage('appointments', this.appointments);
                this.saveToStorage('clients', this.clients);
                this.saveToStorage('caixa', this.caixa);
                this.saveToStorage('caixaHistory', this.caixaHistory);
            }

            getFromStorage(key, defaultValue) {
                try {
                    const item = localStorage.getItem(`barberpro_${key}`);
                    return item ? JSON.parse(item) : defaultValue;
                } catch {
                    return defaultValue;
                }
            }

            saveToStorage(key, data) {
                try {
                    localStorage.setItem(`barberpro_${key}`, JSON.stringify(data));
                } catch (error) {
                    console.error(`Erro ao salvar dados (chave: ${key}):`, error);
                    this.showNotification('Erro ao salvar os dados.', 'error');
                }
            }

            resetTestData() {
                if (confirm('ATENÇÃO!\nIsto irá apagar TODOS os dados (agendamentos, clientes, caixa, etc).\nDeseja continuar?')) {
                    this.appointments = [];
                    this.clients = [];
                    this.caixa = { status: 'fechado', saldoInicial: 0, abertura: null, entradas: [], saidas: [] };
                    this.caixaHistory = [];
                    localStorage.removeItem('barberpro_services');
                    localStorage.removeItem('barberpro_barbers');
                    this.saveData();
                    this.loadData();
                    this.renderBarberView();
                    this.showNotification('Dados de teste foram zerados.', 'success');
                }
            }
            
            // --- MÉTODOS DE GERENCIAMENTO DE SERVIÇOS E PROFISSIONAIS (CORRIGIDO) ---

            showServiceModal(id = null) {
                const service = id ? this.services.find(s => s.id === id) : {};
                const priceValue = service.price ? String(service.price.toFixed(2)).replace('.', ',') : '';
                const content = `
                    <form id="serviceForm">
                        <input type="hidden" name="id" value="${service.id || ''}">
                        <div class="form-group"><label>Nome do Serviço</label><input type="text" name="name" value="${service.name || ''}" required></div>
                        <div class="form-group"><label>Preço (R$)</label><input type="text" name="price" placeholder="Ex: 42,00" value="${priceValue}" required></div>
                        <div class="form-group"><label>Duração (em minutos)</label><input type="number" step="15" min="15" name="duration" value="${service.duration || '45'}" required></div>
                        <div class="form-group"><label>Descrição (Opcional)</label><input type="text" name="description" value="${service.description || ''}"></div>
                        <div class="form-group"><label>URL da Imagem (Opcional)</label><input type="url" name="imageUrl" placeholder="https://exemplo.com/imagem.jpg" value="${service.imageUrl || ''}"></div>
                    </form>`;
                const footer = `
                    <div class="modal-footer-actions">
                        <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                        <button type="button" class="btn-primary" onclick="window.barberPro.saveService(new FormData(document.getElementById('serviceForm')))">${id ? 'Salvar Alterações' : 'Adicionar Serviço'}</button>
                    </div>`;
                this.showModal(id ? 'Editar Serviço' : 'Novo Serviço', content, footer);
            }

            saveService(formData) {
                const id = formData.get('id') || null;
                const name = formData.get('name')?.trim();
                const priceStr = formData.get('price');
                const durationStr = formData.get('duration');

                if (!name) {
                    return this.showNotification('O nome do serviço é obrigatório.', 'error');
                }
                if (this.services.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== id)) {
                    return this.showNotification('Já existe um serviço com este nome.', 'error');
                }
                const price = this.parseCurrency(priceStr);
                if (isNaN(price) || price < 0) {
                    return this.showNotification('O preço inserido é inválido. Use um formato como 42,00.', 'error');
                }
                const duration = parseInt(durationStr, 10);
                if (isNaN(duration) || duration <= 0) {
                    return this.showNotification('A duração inserida é inválida. Deve ser um número maior que zero.', 'error');
                }

                const serviceData = {
                    name,
                    price,
                    duration,
                    description: formData.get('description')?.trim() || '',
                    imageUrl: formData.get('imageUrl')?.trim() || ''
                };

                if (id) {
                    const index = this.services.findIndex(s => s.id === id);
                    if (index !== -1) {
                        this.services[index] = { ...this.services[index], ...serviceData };
                        this.showNotification('Serviço atualizado com sucesso!', 'success');
                    } else {
                        return this.showNotification('Erro: Serviço não encontrado para edição.', 'error');
                    }
                } else {
                    const newService = { id: `s_${Date.now()}`, ...serviceData };
                    if (!newService.imageUrl) {
                        newService.imageUrl = `https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=80&h=80&fit=crop`;
                    }
                    this.services.push(newService);
                    this.showNotification('Serviço adicionado com sucesso!', 'success');
                }

                this.saveData();
                this.hideModal();
                this.renderServicesList();
                this.updateServiceDropdown();
            }

            deleteService(id) {
                if (this.services.length <= 1) {
                    return this.showNotification('É necessário ter pelo menos um serviço cadastrado.', 'error');
                }
                const today = this.getTodayDateString();
                const hasFutureAppointments = this.appointments.some(
                    app => app.service === id && app.date >= today && (app.status === 'scheduled' || app.status === 'in_progress')
                );
                if (hasFutureAppointments) {
                    return this.showNotification('Não é possível excluir. Este serviço está em agendamentos futuros.', 'error');
                }
                if (confirm('Tem certeza que deseja remover este serviço? Esta ação não pode ser desfeita.')) {
                    this.services = this.services.filter(s => s.id !== id);
                    this.saveData();
                    this.renderServicesList();
                    this.updateServiceDropdown();
                    this.showNotification('Serviço removido com sucesso.');
                }
            }

            showProfessionalModal(id = null) {
                const professional = id ? this.barbers.find(b => b.id === id) : {};
                const content = `
                    <form id="professionalForm">
                        <input type="hidden" name="id" value="${professional.id || ''}">
                        <div class="form-group"><label>Nome do Profissional</label><input type="text" name="name" value="${professional.name || ''}" required></div>
                        <div class="form-group"><label>Especialidade (Opcional)</label><input type="text" name="specialty" placeholder="Ex: Cortes e Barba" value="${professional.specialty || ''}">
                    </form>`;
                const footer = `
                    <div class="modal-footer-actions">
                        <button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button>
                        <button type="button" class="btn-primary" onclick="window.barberPro.saveProfessional(new FormData(document.getElementById('professionalForm')))">${id ? 'Salvar Alterações' : 'Adicionar Profissional'}</button>
                    </div>`;
                this.showModal(id ? 'Editar Profissional' : 'Novo Profissional', content, footer);
            }

            saveProfessional(formData) {
                const id = formData.get('id') || null;
                const name = formData.get('name')?.trim();

                if (!name) {
                    return this.showNotification('O nome do profissional é obrigatório.', 'error');
                }
                if (this.barbers.some(b => b.name.toLowerCase() === name.toLowerCase() && b.id !== id)) {
                    return this.showNotification('Já existe um profissional com este nome.', 'error');
                }

                const professionalData = {
                    name,
                    specialty: formData.get('specialty')?.trim() || ''
                };

                if (id) {
                    const index = this.barbers.findIndex(b => b.id === id);
                    if (index !== -1) {
                        this.barbers[index] = { ...this.barbers[index], ...professionalData };
                        this.showNotification('Profissional atualizado com sucesso!', 'success');
                    } else {
                        return this.showNotification('Erro: Profissional não encontrado para edição.', 'error');
                    }
                } else {
                    this.barbers.push({ id: `b_${Date.now()}`, ...professionalData });
                    this.showNotification('Profissional adicionado com sucesso!', 'success');
                }

                this.saveData();
                this.hideModal();
                this.renderProfessionalsList();
                this.updateBarberDropdowns();
            }

            deleteProfessional(id) {
                if (this.barbers.length <= 1) {
                    return this.showNotification('É necessário ter pelo menos um profissional cadastrado.', 'error');
                }
                const today = this.getTodayDateString();
                const hasFutureAppointments = this.appointments.some(
                    app => app.barberId === id && app.date >= today && (app.status === 'scheduled' || app.status === 'in_progress')
                );
                if (hasFutureAppointments) {
                    return this.showNotification('Não é possível excluir. Este profissional possui agendamentos futuros.', 'error');
                }
                if (confirm('Tem certeza que deseja remover este profissional? Esta ação não pode ser desfeita.')) {
                    this.barbers = this.barbers.filter(b => b.id !== id);
                    this.saveData();
                    this.renderProfessionalsList();
                    this.updateBarberDropdowns();
                    this.showNotification('Profissional removido com sucesso.');
                }
            }
            
            // --- RESTANTE DAS FUNÇÕES DA APLICAÇÃO ---

            renderClientView() {
                this.showSection('clientArea');
                this.resetBookingFlow();

                const searchTerm = document.getElementById('serviceSearchInput')?.value.toLowerCase() || '';
                const container = document.getElementById('clientServicesList');

                if (container) {
                    const filteredServices = this.services.filter(service =>
                        service.name.toLowerCase().includes(searchTerm)
                    );

                    if (filteredServices.length > 0) {
                        container.innerHTML = filteredServices.map(service => `
                            <div class="service-card-v2">
                                <img src="${service.imageUrl || 'https://via.placeholder.com/64x64.png/c7a355/222831?text=S'}" alt="${service.name}" class="service-image">
                                <div class="service-details">
                                    <h4>${service.name}</h4>
                                    <div class="sub-details">
                                        <span>${this.formatCurrency(service.price)}</span> &bull; <span>${service.duration} min</span>
                                    </div>
                                </div>
                                <button class="btn-primary" onclick="window.barberPro.startBooking('${service.id}')">Agendar</button>
                            </div>
                        `).join('');
                    } else {
                        container.innerHTML = '<p class="empty-state">Nenhum serviço encontrado.</p>';
                    }
                }
            }

            renderBarberView() {
                this.showSection('barberDashboard');
                const agendaDateFilter = document.getElementById('agendaDateFilter');
                if (agendaDateFilter && !agendaDateFilter.value) {
                    agendaDateFilter.value = this.getTodayDateString();
                }
                this.switchDashboardView('dashboardView');
            }

            resetBookingFlow() {
                this.bookingState = {};
                document.getElementById('clientServicesSection').style.display = 'block';
                document.getElementById('bookingFlowContainer').style.display = 'none';
                document.querySelectorAll('.booking-step').forEach(step => step.style.display = 'none');
                document.getElementById('step1_Professionals').style.display = 'block';
            }

            showBookingStep(stepNumber) {
                document.querySelectorAll('.booking-step').forEach(step => step.style.display = 'none');
                document.getElementById(`step${stepNumber}_${stepNumber === 1 ? 'Professionals' : stepNumber === 2 ? 'DateTime' : 'Confirmation'}`).style.display = 'block';
            }

            startBooking(serviceId) {
                const service = this.services.find(s => s.id === serviceId);
                if (!service) return;

                this.bookingState = {
                    serviceId,
                    serviceName: service.name,
                    servicePrice: service.price,
                    serviceDuration: service.duration
                };

                document.getElementById('clientServicesSection').style.display = 'none';
                document.getElementById('bookingFlowContainer').style.display = 'block';

                const container = document.getElementById('professionalsListContainer');
                container.innerHTML = this.barbers.map(barber => `
                    <div class="barber-card-selectable glass-card" onclick="window.barberPro.selectProfessional('${barber.id}')">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=c7a355&color=fff&size=128" alt="${barber.name}">
                        <h4>${barber.name}</h4>
                    </div>
                `).join('');
                this.showBookingStep(1);
            }

            selectProfessional(barberId) {
                const barber = this.barbers.find(b => b.id === barberId);
                if (!barber) return;
                this.bookingState.barberId = barberId;
                this.bookingState.barberName = barber.name;

                this.showBookingStep(2);
                const dateInput = document.getElementById('bookingDate');
                dateInput.min = this.getTodayDateString();
                dateInput.value = this.getTodayDateString();
                this.renderAvailableTimes();

                dateInput.onchange = () => this.renderAvailableTimes();
            }

            renderAvailableTimes() {
                const date = document.getElementById('bookingDate').value;
                const barberId = this.bookingState.barberId;
                const serviceDuration = this.bookingState.serviceDuration;
                const container = document.getElementById('availableTimesContainer');
                container.innerHTML = '<p>Carregando horários...</p>';

                const allSlots = [];
                for (let h = 9; h < 19; h++) {
                    if (h === 12 || h === 13) continue;
                    for (let m = 0; m < 60; m += 15) {
                        allSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                    }
                }

                const appointmentsOnDate = this.appointments.filter(a => a.barberId === barberId && a.date === date && a.status !== 'cancelled');
                const occupiedSlots = new Set();

                appointmentsOnDate.forEach(app => {
                    const appService = this.services.find(s => s.id === app.service);
                    if (!appService) return;

                    const startSlotIndex = allSlots.indexOf(app.time);
                    if (startSlotIndex === -1) return;

                    const slotsToOccupy = Math.ceil(appService.duration / 15);
                    for (let i = 0; i < slotsToOccupy; i++) {
                        if (allSlots[startSlotIndex + i]) {
                            occupiedSlots.add(allSlots[startSlotIndex + i]);
                        }
                    }
                });

                let availableSlotsHTML = '';
                allSlots.forEach((slot, index) => {
                    let isAvailable = true;
                    const slotsNeeded = Math.ceil(serviceDuration / 15);
                    for (let i = 0; i < slotsNeeded; i++) {
                        const checkSlot = allSlots[index + i];
                        if (!checkSlot || occupiedSlots.has(checkSlot)) {
                            isAvailable = false;
                            break;
                        }
                    }
                    availableSlotsHTML += `<button class="time-slot-btn" onclick="window.barberPro.selectTime('${slot}')" ${!isAvailable ? 'disabled' : ''}>${slot}</button>`;
                });

                container.innerHTML = availableSlotsHTML || '<p class="empty-state">Nenhum horário disponível para esta data.</p>';
            }

            selectTime(time) {
                this.bookingState.time = time;
                this.renderConfirmationStep();
                this.showBookingStep(3);
            }

            renderConfirmationStep() {
                const {
                    serviceName,
                    barberName,
                    servicePrice,
                    time
                } = this.bookingState;
                const date = document.getElementById('bookingDate').value;
                const endDate = new Date(`${date}T${time}`);
                endDate.setMinutes(endDate.getMinutes() + this.bookingState.serviceDuration);
                const endTime = endDate.toTimeString().slice(0, 5);

                const summaryContainer = document.getElementById('confirmationSummary');
                summaryContainer.innerHTML = `
                    <p><span>Serviço</span> <span>${serviceName}</span></p>
                    <p><span>Profissional</span> <span>${barberName}</span></p>
                    <p><span>Data</span> <span>${this.formatDate(date)}</span></p>
                    <p><span>Horário</span> <span>${time} - ${endTime} (${this.bookingState.serviceDuration} min)</span></p>
                    <hr>
                    <p class="total"><span>Total</span> <span>${this.formatCurrency(servicePrice)}</span></p>
                `;
            }

            handleClientBookingConfirmation(e) {
                e.preventDefault();
                const name = document.getElementById('finalClientName').value.trim();
                const phone = this.sanitizePhone(document.getElementById('finalClientPhone').value.trim());
                const date = document.getElementById('bookingDate').value;

                if (!name || !phone) {
                    return this.showNotification('Por favor, preencha seu nome e telefone.', 'error');
                }

                const appointment = {
                    id: Date.now().toString(),
                    createdAt: new Date().toISOString(),
                    name,
                    phone: this.sanitizePhone(phone),
                    service: this.bookingState.serviceId,
                    barberId: this.bookingState.barberId,
                    date: date,
                    time: this.bookingState.time,
                    status: 'scheduled',
                    paymentStatus: 'pending'
                };

                this.getOrUpdateClient(appointment.phone, appointment.name);
                this.appointments.push(appointment);
                this.saveData();
                this.showNotification('Agendamento confirmado com sucesso! 🎉', 'success');
                this.resetBookingFlow();
            }

            showSection(sectionId) {
                document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
                document.getElementById(sectionId).style.display = 'block';
                document.querySelector('.navbar').style.display = sectionId === 'barberDashboard' ? 'none' : 'flex';
                document.getElementById('clientAreaBtn').classList.toggle('active', sectionId === 'clientArea');
            }

            switchDashboardView(viewId) {
                if (!viewId) return;
                document.querySelectorAll('.content-view').forEach(v => v.style.display = 'none');
                document.getElementById(viewId).style.display = 'block';
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
                const { title, subtitle } = titles[viewId] || { title: 'Página', subtitle: '' };
                document.getElementById('dashboardTitle').textContent = title;
                document.getElementById('dashboardSubtitle').textContent = subtitle;
                document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active', 'parent-active'));
                const activeNavItem = document.querySelector(`.sidebar-nav .nav-item[data-view="${viewId}"]`);
                if (activeNavItem) {
                    activeNavItem.classList.add('active');
                    const parentGroup = activeNavItem.closest('.nav-group');
                    if (parentGroup) {
                        parentGroup.querySelector('.nav-parent')?.classList.add('parent-active');
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
                if (renderActions[viewId]) renderActions[viewId].call(this);
                document.body.classList.remove('sidebar-is-open');
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
                    this.currentUser = {
                        username: 'barbeiro'
                    };
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

            handleAppointmentSubmit(formData, isWalkIn) {
                const name = formData.get('name').trim();
                const phone = this.sanitizePhone(formData.get('phone'));
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
                    paymentStatus: 'pending'
                };
                this.getOrUpdateClient(appointment.phone, appointment.name);
                this.appointments.push(appointment);
                this.saveData();
                this.showNotification(isWalkIn ? 'Comanda aberta com sucesso!' : 'Agendamento realizado com sucesso!', 'success');
                this.hideModal();
                if (this.currentUser) this.renderRelevantViews();
            }
            startService(appointmentId) {
                if (!this.checkCaixaStatus()) return;
                const appointment = this.appointments.find(a => a.id === appointmentId);
                if (appointment) {
                    appointment.status = 'in_progress';
                    this.saveData();
                    this.hideModal();
                    this.showNotification('Atendimento iniciado! A comanda foi aberta.', 'success');
                    this.switchDashboardView('comandasView');
                }
            }
            finalizeAppointment(appointmentId, paymentMethod, finalPrice) {
                const appointment = this.appointments.find(a => a.id === appointmentId);
                if (!appointment) return;
                const service = this.services.find(s => s.id === appointment.service);
                if (!service) return;

                if (isNaN(finalPrice) || finalPrice < 0) {
                    return this.showNotification('Por favor, insira um valor final válido.', 'error');
                }

                this.caixa.entradas.push({
                    descricao: `Serviço: ${service.name} (${appointment.name})`,
                    valor: finalPrice,
                    data: new Date().toISOString(),
                    metodo: paymentMethod
                });
                appointment.status = 'completed';
                appointment.paymentStatus = 'paid';
                appointment.paymentMethod = paymentMethod;
                appointment.finalPrice = finalPrice;
                appointment.closedAt = new Date().toISOString();
                this.saveData();
                this.hideModal();
                this.showNotification(`Pagamento de ${this.formatCurrency(finalPrice)} recebido!`, 'success');
                this.renderRelevantViews();
            }
            cancelAppointment(id) {
                if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
                    const appointment = this.appointments.find(a => a.id === id);
                    if (appointment) {
                        appointment.status = 'cancelled';
                        this.saveData();
                        this.hideModal();
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
            fecharCaixa(countedCash) {
                if (isNaN(countedCash) || countedCash < 0) return this.showNotification('Valor conferido em dinheiro é inválido.', 'error');
                const totalEntradas = this.caixa.entradas.reduce((sum, item) => sum + item.valor, 0);
                const totalSaidas = this.caixa.saidas.reduce((sum, item) => sum + item.valor, 0);
                const dinheiroEntradas = this.caixa.entradas.filter(e => e.metodo === 'Dinheiro').reduce((sum, e) => sum + e.valor, 0);
                const saldoEsperadoDinheiro = this.caixa.saldoInicial + dinheiroEntradas - totalSaidas;
                const closingSummary = {
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
                this.caixa = {
                    status: 'fechado',
                    saldoInicial: 0,
                    abertura: null,
                    entradas: [],
                    saidas: []
                };
                this.saveData();
                this.hideModal();
                this.updateCaixaStatusIndicator();
                this.renderFinancialPage();
                this.showNotification('Caixa fechado e salvo no histórico.', 'success');
            }
            saveExpense(formData) {
                if (!this.checkCaixaStatus()) return;
                const amount = this.parseCurrency(formData.get('amount'));
                const description = formData.get('description');
                if (!description || !(amount > 0)) return this.showNotification('Preencha a descrição e um valor válido.', 'error');
                this.caixa.saidas.push({
                    descricao: description,
                    valor: amount,
                    data: new Date().toISOString()
                });
                this.saveData();
                this.hideModal();
                this.renderFinancialPage();
                this.updateCaixaStatusIndicator();
                this.showNotification('Despesa registrada!', 'success');
            }

            loadDashboardData() {
                if (!this.currentUser) return;
                this.updateCaixaStatusIndicator();
                this.updateStats();
                this.renderDashboardAppointments();
                const welcomeOpenCaixaBtn = document.getElementById('welcomeOpenCaixaBtn');
                if (welcomeOpenCaixaBtn) {
                    welcomeOpenCaixaBtn.style.display = this.caixa.status === 'fechado' ? 'inline-block' : 'none';
                }
            }
            updateStats() {
                const todayStr = this.getTodayDateString();
                const todayAppointments = this.appointments.filter(a => a.date === todayStr && a.status === 'scheduled');
                const todayRevenue = (this.caixa.entradas || []).filter(e => new Date(e.data).toISOString().split('T')[0] === todayStr).reduce((sum, e) => sum + e.valor, 0);
                const pendingCount = this.appointments.filter(a => a.status === 'in_progress').length;
                document.getElementById('todayCount').textContent = todayAppointments.length;
                document.getElementById('pendingCount').textContent = pendingCount;
                document.getElementById('todayProfit').textContent = this.formatCurrency(todayRevenue);
            }
            renderDashboardAppointments() {
                const listEl = document.getElementById('appointmentsList');
                if (!listEl) return;
                const today = this.getTodayDateString();
                const upcoming = this.appointments.filter(a => a.date >= today && (a.status === 'scheduled' || a.status === 'in_progress')).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5);
                listEl.innerHTML = upcoming.length === 0 ? '<p class="empty-state">Nenhum agendamento futuro.</p>' : upcoming.map(a => this.createAppointmentCard(a)).join('');
            }
            renderPendingAppointments() {
                const container = document.getElementById('pendingAppointmentsList');
                if (!container) return;
                const pending = this.appointments.filter(a => a.status === 'in_progress');
                container.innerHTML = pending.length === 0 ? '<p class="empty-state">Nenhuma comanda em andamento.</p>' : pending.map(app => this.createAppointmentCard(app)).join('');
            }
            renderAgendaView() {
                const container = document.getElementById('agendaViewContainer');
                const dateFilter = document.getElementById('agendaDateFilter');
                if (!container || !dateFilter || this.barbers.length === 0) {
                    if (container) container.innerHTML = '<p class="empty-state">Cadastre um profissional primeiro.</p>';
                    return;
                };
                const selectedDate = dateFilter.value;
                container.innerHTML = '';
                const timeSlots = [];
                for (let h = 9; h < 19; h++) {
                    if (h === 12 || h === 13) continue;
                    for (let m = 0; m < 60; m += 15) timeSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                }
                const slotHeight = 20;
                const timeColumnHTML = '<div class="agenda-time-column">' + timeSlots.map(time => `<div class="agenda-time-slot" style="height: ${slotHeight}px;">${time.endsWith(':00') ? `<b>${time}</b>` : time}</div>`).join('') + '</div>';
                let barbersAreaHTML = `<div class="agenda-barbers-area" style="grid-template-columns: repeat(${this.barbers.length}, 1fr);">
`;
                this.barbers.forEach(barber => {
                    barbersAreaHTML += `<div class="agenda-barber-column"><div class="agenda-barber-header">${barber.name}</div><div class="agenda-slots-container" style="height: ${timeSlots.length * slotHeight}px;">
`;
                    this.appointments.filter(a => a.barberId === barber.id && a.date === selectedDate && a.status !== 'cancelled').forEach(app => {
                        const service = this.services.find(s => s.id === app.service);
                        if (!service || !app.time) return;
                        try {
                            const [startHour, startMinute] = app.time.split(':').map(Number);
                            let minutesFrom9 = (startHour - 9) * 60 + startMinute;
                            if (startHour >= 14) {
                                minutesFrom9 -= 120;
                            }
                            const topPosition = (minutesFrom9 / 15) * slotHeight;
                            const height = (service.duration / 15) * slotHeight;
                            barbersAreaHTML += `<div class="agenda-appointment-block status-${app.status}" data-id="${app.id}" data-action="open-comanda-modal" style="top: ${topPosition}px; height: ${height}px;"><strong class="appointment-block-name">${app.time} - ${app.name}</strong><span class="appointment-block-service">${service.name}</span></div>`;
                        } catch (e) {
                            console.error("Erro ao renderizar agendamento:", app, e);
                        }
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
                    scheduled: 'Agendado',
                    completed: 'Concluído',
                    cancelled: 'Cancelado',
                    in_progress: 'Em Andamento'
                };
                const status = statusMap[appointment.status] || appointment.status;
                return `<div class="appointment-card" data-id="${appointment.id}" data-action="open-comanda-modal"><div class="appointment-header"><div><h4>${appointment.name}</h4><p>${this.formatDate(appointment.date)} - ${appointment.time}h</p></div><div><p>${barber?.name || 'N/A'}</p><span class="appointment-status status-${appointment.status}">${status}</span></div></div><div class="appointment-footer"><p>${service?.name || 'Serviço'} - <strong>${this.formatCurrency(service?.price || 0)}</strong></p></div></div>`;
            }
            renderFullClientsList() {
                const container = document.getElementById('fullClientsList');
                const searchTerm = document.getElementById('clientSearchInput').value.toLowerCase();
                if (!container) return;
                const clients = this.clients.filter(c => c.name.toLowerCase().includes(searchTerm) || c.phone.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name));
                container.innerHTML = clients.length === 0 ? '<p class="empty-state">Nenhum cliente encontrado.</p>' : clients.map(client => `<div class="data-card"><div><strong>${client.name}</strong><div class="data-card-info"><span>📞 ${client.phone}</span></div></div><div class="data-card-actions"><button class="btn-secondary btn-small" data-action="view-client-details" data-id="${client.phone}">Ver Detalhes</button></div></div>`).join('');
            }
            renderServicesList() {
                const container = document.getElementById('servicesList');
                if (!container) return;
                container.innerHTML = this.services.map(service => `<div class="data-card"><div><strong>${service.name}</strong><div class="data-card-info"><span>💰 ${this.formatCurrency(service.price)}</span><span>⏱️ ${service.duration} min</span></div></div><div class="data-card-actions"><button class="btn-secondary btn-small" data-action="edit-service" data-id="${service.id}">Editar</button><button class="btn-secondary btn-danger btn-small" data-action="delete-service" data-id="${service.id}">Excluir</button></div></div>`).join('');
            }
            renderProfessionalsList() {
                const container = document.getElementById('professionalsList');
                if (!container) return;
                container.innerHTML = this.barbers.map(barber => `<div class="data-card"><div><strong>${barber.name}</strong><div class="data-card-info"><span>${barber.specialty || 'Sem especialidade'}</span></div></div><div class="data-card-actions"><button class="btn-secondary btn-small" data-action="edit-professional" data-id="${barber.id}">Editar</button><button class="btn-secondary btn-danger btn-small" data-action="delete-professional" data-id="${barber.id}">Excluir</button></div></div>`).join('');
            }
            renderFinancialPage() {
                const container = document.getElementById('financialDashboard');
                const [openBtn, closeBtn, expenseBtn] = ['openCaixaBtn', 'closeCaixaBtn', 'addExpenseBtnMain'].map(id => document.getElementById(id));
                if (!container || !openBtn || !closeBtn || !expenseBtn) return;
                if (this.caixa.status === 'aberto') {
                    openBtn.style.display = 'none';
                    closeBtn.style.display = 'inline-block';
                    expenseBtn.style.display = 'inline-block';
                    const totalEntradas = this.caixa.entradas.reduce((sum, e) => sum + e.valor, 0);
                    const totalSaidas = this.caixa.saidas.reduce((sum, s) => sum + s.valor, 0);
                    const saldoAtual = this.caixa.saldoInicial + totalEntradas - totalSaidas;
                    container.innerHTML = `<div class="financial-summary"><div class="summary-item"><p>Saldo Inicial</p><h4>${this.formatCurrency(this.caixa.saldoInicial)}</h4></div><div class="summary-item"><p>Entradas</p><h4 class="text-green">${this.formatCurrency(totalEntradas)}</h4></div><div class="summary-item"><p>Saídas</p><h4 class="text-red">${this.formatCurrency(totalSaidas)}</h4></div><div class="summary-item total"><p>Saldo Atual</p><h4>${this.formatCurrency(saldoAtual)}</h4></div></div>`;
                } else {
                    openBtn.style.display = 'inline-block';
                    closeBtn.style.display = 'none';
                    expenseBtn.style.display = 'none';
                    container.innerHTML = `<div class="empty-state"><h3>Caixa Fechado</h3><p>Clique em "Abrir Caixa" para iniciar as operações.</p></div>`;
                }
            }
            renderCharts() {
                Object.values(this.charts).forEach(chart => chart.destroy());
                this.renderRevenueChart();
                this.renderServicesChart();
            }

            getOrUpdateClient(phone, name) {
                let client = this.clients.find(c => c.phone === phone);
                if (!client) {
                    this.clients.push({
                        phone,
                        name,
                        createdAt: new Date().toISOString()
                    });
                } else if (client.name !== name) {
                    client.name = name;
                }
            }
            
            showModal(title, content, footerHTML = '') {
                document.getElementById('modalTitle').textContent = title;
                document.getElementById('modalContent').innerHTML = content;
                document.getElementById('modalFooter').innerHTML = footerHTML;
                document.getElementById('modalBackdrop').style.display = 'flex';
                document.body.classList.add('modal-open');
                const firstInput = document.querySelector('#modalContent input, #modalContent select');
                if (firstInput) firstInput.focus();
            }
            hideModal() {
                document.getElementById('modalBackdrop').style.display = 'none';
                document.body.classList.remove('modal-open');
            }
            showNotification(message, type = 'success') {
                const container = document.getElementById('notificationContainer');
                if (!container) return;
                const notification = document.createElement('div');
                notification.className = `notification ${type}`;
                notification.textContent = message;
                container.appendChild(notification);
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 500);
                }, 3500);
            }
            
            showAppointmentModal(isScheduled) {
                const agendaDate = document.getElementById('agendaDateFilter')?.value || this.getTodayDateString();
                const content = `<form id="barberBookingForm" data-walk-in="${!isScheduled}"><div class="form-group"><label>Cliente</label><input type="text" name="name" list="clientSuggestions" placeholder="Buscar ou cadastrar novo" required autocomplete="off"></div><div class="form-group"><label>Celular (DDD)</label><input type="tel" name="phone" placeholder="11999999999" required></div><div class="form-group"><label>Serviço</label><select name="service" required>${this.generateServiceOptions()}</select></div><div class="form-group"><label>Profissional</label><select name="barber" required>${this.generateBarberOptions()}</select></div>${isScheduled ? `<div class="form-group"><label>Data</label><input type="date" name="date" value="${agendaDate}" min="${this.getTodayDateString()}" required></div><div class="form-group"><label>Horário</label><select name="time" required>${this.generateTimeOptions()}</select></div>` : ''}</form>${this.populateClientDatalist()}`;
                const footer = `<div class="modal-footer-actions"><button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button><button type="submit" form="barberBookingForm" class="btn-primary">Confirmar</button></div>`;
                this.showModal(isScheduled ? 'Novo Agendamento' : 'Novo Atendimento (Encaixe)', content, footer);
            }
            showClientDetailModal(phone) {
                const client = this.clients.find(c => c.phone === phone);
                if (!client) return;
                const clientAppointments = this.appointments.filter(a => a.phone === phone).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const statusMap = {
                    scheduled: 'Agendado',
                    completed: 'Concluído',
                    cancelled: 'Cancelado',
                    in_progress: 'Em Andamento'
                };
                const content = `<div><h4>${client.name}</h4><p><strong>Telefone:</strong> ${client.phone}</p><p><strong>Cliente desde:</strong> ${this.formatDate(client.createdAt)}</p><hr><h5>Histórico</h5><div>${clientAppointments.length > 0 ? clientAppointments.map(a => `<div class="data-card"><span>${this.formatDate(a.date)}</span><span>${this.services.find(s=>s.id===a.service)?.name || ''}</span><span class="appointment-status status-${a.status}">${statusMap[a.status] || a.status}</span></div>`).join('') : '<p>Nenhum histórico.</p>'}</div></div>`;
                this.showModal('Detalhes do Cliente', content);
            }
            showCaixaHistoryModal() {
                const content = `<div>${this.caixaHistory.sort((a,b) => new Date(b.fechamento) - new Date(a.fechamento)).map(item => `<div class="data-card"><div><strong>Fechamento:</strong> ${new Date(item.fechamento).toLocaleString('pt-BR')}</div><div>Faturamento: ${this.formatCurrency(item.totalEntradas)}</div><div class="${item.diferenca !== 0 ? (item.diferenca < 0 ? 'text-red' : 'text-green') : ''}">Diferença: ${this.formatCurrency(item.diferenca)}</div></div>`).join('') || '<p class="empty-state">Nenhum histórico.</p>'}</div>`;
                this.showModal('Histórico de Caixa', content);
            }
            showExpenseModal() {
                if (!this.checkCaixaStatus()) return;
                const content = `<form id="expenseForm"><div class="form-group"><label>Descrição</label><input type="text" name="description" required></div><div class="form-group"><label>Valor (R$)</label><input type="text" name="amount" placeholder="Ex: 50,00" required></div></form>`;
                const footer = `<div class="modal-footer-actions"><button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button><button type="submit" form="expenseForm" class="btn-primary">Adicionar Despesa</button></div>`;
                this.showModal('Adicionar Despesa', content, footer);
            }
            showAbrirCaixaModal() {
                const content = `<form id="openCaixaForm"><div class="form-group"><label>Valor Inicial (Troco)</label><input type="text" name="initialValue" placeholder="Ex: 100,00" required></div></form>`;
                const footer = `<div class="modal-footer-actions"><button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button><button type="submit" form="openCaixaForm" class="btn-primary">Abrir Caixa</button></div>`;
                this.showModal('Abrir Caixa', content, footer);
            }
            showFecharCaixaModal() {
                const content = `<form id="closeCaixaForm"><div class="form-group"><label>Dinheiro Contado na Gaveta</label><input type="text" name="countedCash" placeholder="Ex: 450,50" required></div></form>`;
                const footer = `<div class="modal-footer-actions"><button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button><button type="submit" form="closeCaixaForm" class="btn-primary">Fechar Caixa</button></div>`;
                this.showModal('Fechar Caixa', content, footer);
            }
            showComandaActionsModal(appointmentId) {
                const appointment = this.appointments.find(a => a.id === appointmentId);
                if (!appointment) return;
                const service = this.services.find(s => s.id === appointment.service);
                let actions = '';
                if (appointment.status === 'scheduled') actions = `<button id="startServiceBtn" class="btn-primary">Iniciar Atendimento</button>`;
                else if (appointment.status === 'in_progress') actions = `<button id="finalizeServiceBtn" class="btn-primary">Finalizar e Receber</button>`;
                const content = `<div><p><strong>Cliente:</strong> ${appointment.name}</p><p><strong>Serviço:</strong> ${service?.name}</p><p><strong>Valor:</strong> ${this.formatCurrency(service?.price || 0)}</p></div>`;
                const footer = `<div><button type="button" class="btn-secondary btn-danger btn-small" data-action="cancel-appointment" data-id="${appointment.id}">Cancelar Agend.</button><button type="button" id="remindWhatsAppBtn" class="btn-secondary btn-small" style="margin-left: 0.5rem;"><i class="fab fa-whatsapp"></i> Lembrar</button></div><div class="modal-footer-actions"><button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Fechar</button>${actions}</div>`;
                this.showModal('Gerenciar Atendimento', content, footer);
                document.getElementById('startServiceBtn')?.addEventListener('click', () => this.startService(appointmentId));
                document.getElementById('finalizeServiceBtn')?.addEventListener('click', () => this.showFinalizeAppointmentModal(appointmentId));
                document.getElementById('remindWhatsAppBtn')?.addEventListener('click', () => this.sendWhatsAppReminder(appointmentId));
            }
            showFinalizeAppointmentModal(appointmentId) {
                const appointment = this.appointments.find(a => a.id === appointmentId);
                if (!appointment) return;
                const service = this.services.find(s => s.id === appointment.service);
                const content = `<form id="finalizeForm"><p>Finalizando <strong>${appointment.name}</strong>.</p><div class="form-group"><label for="finalPrice">Valor Final a Cobrar (R$)</label><input type="text" id="finalPrice" name="finalPrice" value="${(service?.price || 0).toFixed(2).replace('.', ',')}" placeholder="Ex: 42,00" required></div><div class="form-group"><label for="paymentMethod">Forma de Pagamento</label><select id="paymentMethod" name="paymentMethod" required><option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartão de Débito">Cartão de Débito</option><option value="Cartão de Crédito">Cartão de Crédito</option></select></div></form>`;
                const footer = `<div class="modal-footer-actions"><button type="button" class="btn-secondary" onclick="window.barberPro.hideModal()">Cancelar</button><button type="submit" form="finalizeForm" class="btn-primary">Confirmar Pagamento</button></div>`;
                this.showModal('Finalizar e Receber', content, footer);
                document.getElementById('finalizeForm')?.addEventListener('submit', e => {
                    e.preventDefault();
                    const form = e.target;
                    const paymentMethod = form.querySelector('[name="paymentMethod"]').value;
                    const finalPrice = this.parseCurrency(form.querySelector('[name="finalPrice"]').value);
                    this.finalizeAppointment(appointmentId, paymentMethod, finalPrice);
                });
            }

            sendWhatsAppReminder(appointmentId) {
                const appointment = this.appointments.find(a => a.id === appointmentId);
                if (!appointment) return this.showNotification('Agendamento não encontrado.', 'error');
                const clientName = appointment.name.split(' ')[0];
                const appointmentTime = appointment.time;
                const appointmentDate = this.formatDate(appointment.date);
                const message = `Olá ${clientName}, passando para lembrar do seu agendamento na Steves Barbearia no dia ${appointmentDate} às ${appointmentTime}. Podemos confirmar?`;
                let phone = this.sanitizePhone(appointment.phone);
                if (phone.length >= 10 && !phone.startsWith('55')) {
                    phone = '55' + phone;
                }
                const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
                this.showNotification('Abrindo WhatsApp para enviar lembrete.', 'success');
            }

            parseCurrency(value) {
                if (typeof value !== 'string') return NaN;
                const cleanValue = value.replace(/[^0-9,.]/g, '').replace(',', '.');
                return parseFloat(cleanValue);
            }
            updateServiceDropdown() {
                document.querySelectorAll('select[name="service"]').forEach(select => select.innerHTML = this.generateServiceOptions());
            }
            updateBarberDropdowns() {
                document.querySelectorAll('select[name="barber"]').forEach(select => select.innerHTML = this.generateBarberOptions());
            }
            formatCurrency(value) {
                return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                }).format(value || 0);
            }
            formatDate(dateStr) {
                const date = new Date(dateStr);
                const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
            }
            getTodayDateString() {
                return new Date().toISOString().split('T')[0];
            }
            sanitizePhone(phone) {
                return String(phone).replace(/\D/g, '');
            }
            navigateAgendaDays(direction) {
                const dateInput = document.getElementById('agendaDateFilter');
                if (!dateInput.value) return;
                const date = new Date(dateInput.value + 'T00:00:00');
                date.setDate(date.getDate() + direction);
                dateInput.value = date.toISOString().split('T')[0];
                this.renderAgendaView();
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
            generateServiceOptions() {
                return '<option value="">Selecione</option>' + this.services.map(s => `<option value="${s.id}">${s.name} - ${this.formatCurrency(s.price)}</option>`).join('');
            }
            generateBarberOptions() {
                return '<option value="">Selecione</option>' + this.barbers.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            }
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
            renderRelevantViews() {
                if (this.currentUser) {
                    const currentView = document.querySelector('.content-view[style*="block"]')?.id;
                    if (currentView) this.switchDashboardView(currentView);
                    else this.loadDashboardData();
                }
            }
            populateClientDatalist() {
                return `<datalist id="clientSuggestions">${this.clients.map(c => `<option value="${c.name}"></option>`).join('')}</datalist>`;
            }
            handleClientNameInput(event) {
                const client = this.clients.find(c => c.name.toLowerCase() === event.target.value.toLowerCase());
                if (client) {
                    const form = event.target.closest('form');
                    if (form) form.querySelector('input[name="phone"]').value = client.phone;
                }
            }

            renderRevenueChart() {
                const ctx = document.getElementById('revenueChart')?.getContext('2d');
                if (!ctx) return;
                const labels = [];
                const data = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateString = date.toISOString().split('T')[0];
                    labels.push(date.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit'
                    }));
                    const dailyRevenue = this.appointments.filter(a => a.date === dateString && a.status === 'completed' && typeof a.finalPrice === 'number').reduce((sum, a) => sum + a.finalPrice, 0);
                    data.push(dailyRevenue);
                }
                if (this.charts.revenue) this.charts.revenue.destroy();
                this.charts.revenue = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Faturamento',
                            data,
                            borderColor: 'hsl(43, 96%, 56%)',
                            tension: 0.3,
                            fill: true,
                            backgroundColor: 'hsla(43, 96%, 56%, 0.1)'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { color: '#9ca3af' } }, x: { ticks: { color: '#9ca3af' } } },
                        plugins: { legend: { labels: { color: '#9ca3af' } } }
                    }
                });
            }
            renderServicesChart() {
                const ctx = document.getElementById('servicesChart')?.getContext('2d');
                if (!ctx) return;
                const serviceCounts = this.appointments.filter(a => a.status === 'completed').reduce((acc, app) => {
                    const service = this.services.find(s => s.id === app.service);
                    if (service) acc[service.name] = (acc[service.name] || 0) + 1;
                    return acc;
                }, {});
                const labels = Object.keys(serviceCounts);
                const data = Object.values(serviceCounts);
                if (this.charts.services) this.charts.services.destroy();
                this.charts.services = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Atendimentos',
                            data,
                            backgroundColor: ['#f59e0b', '#8b5cf6', '#3b82f6', '#22c55e', '#ef4444'],
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { labels: { color: '#9ca3af' } } }
                    }
                });
            }
        }

        window.barberPro = new BarberPro();
