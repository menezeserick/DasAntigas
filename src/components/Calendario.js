import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment-timezone';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../Styles/Calendario.css';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, where, updateDoc } from 'firebase/firestore';

const localizer = momentLocalizer(moment);
moment.tz.setDefault("America/Sao_Paulo");
moment.locale('pt-br');

const CustomResourceHeader = ({ label }) => (
    <div className="custom-resource-header">
        {label}
    </div>
);

const DailySalesSummary = ({ selectedDate }) => {
    const [sales, setSales] = useState([]);

    useEffect(() => {
        const fetchSales = async () => {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            try {
                const salesQuery = query(
                    collection(db, 'vendas'),
                    where('event.start', '>=', startOfDay),
                    where('event.start', '<=', endOfDay)
                );
                const snapshot = await getDocs(salesQuery);
                const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSales(salesData);
            } catch (error) {
                console.error('Erro ao buscar vendas do dia:', error);
            }
        };

        if (selectedDate) {
            fetchSales();
        }
    }, [selectedDate]);

    return (
        <div className="sales-summary">
            <h3>Resumo de Clientes do Dia</h3>
            {sales.length > 0 ? (
                <ul>
                    {sales.map((sale) => (
                        <li key={sale.id}>
                            <strong>Cliente:</strong> {sale.event.title} <br />
                            <strong>Total:</strong> R$ {sale.totalPrice.toFixed(2)} <br />
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Nenhum cliente lançado para esta data.</p>
            )}
        </div>
    );
};

const CompletionForm = ({ selectedEvent, professionals, paymentMethods, onComplete, onCancel, services }) => {
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [totalPrice, setTotalPrice] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');  


    useEffect(() => {
        if (paymentMethods.length > 0) {
            setSelectedPaymentMethod(paymentMethods[0].name);
        }
    }, [paymentMethods]);

    const calculateTotalPrice = useCallback(() => {
        const total = selectedServices.reduce((total, service) => total + (service.price * service.quantity), 0);
        setTotalPrice(total);
    }, [selectedServices]);

    const handleServiceChange = (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            setSelectedServices((prev) => {
                const existingService = prev.find(s => s.id === service.id);
                if (existingService) {
                    const updatedServices = prev.map(s =>
                        s.id === service.id
                            ? { ...s, quantity: s.quantity + 1 }
                            : s
                    );
                    return updatedServices;
                } else {
                    const newService = { ...service, quantity: 1, selectedProfessional: '' }; 
                    return [...prev, newService];
                }
            });
        }
    };

    const handleAddCompletion = async (e) => {
        e.preventDefault();

        const eventDate = moment(selectedEvent.start).format('YYYY-MM-DD');
        const today = moment().format('YYYY-MM-DD');

        if (eventDate !== today) {
            setErrorMessage('As vendas só podem ser concluídas no mesmo dia do agendamento.');
            return;
        }

        try {
            const vendaDoc = await addDoc(collection(db, "vendas"), {
                event: selectedEvent,
                services: selectedServices,
                paymentMethod: selectedPaymentMethod,
                totalPrice,
            });

            console.log("Venda adicionada com sucesso: ", vendaDoc.id);

            const today = new Date().toLocaleDateString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).split('/').reverse().join('-'); 

            const q = query(collection(db, "boxes"), where("date", "==", today));

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.error(`Nenhum caixa foi encontrado para a data: ${today}`);
                return;
            }

            const boxDoc = querySnapshot.docs[0]; 
            const boxData = boxDoc.data();
            const professionals = boxData.professionals || []; 

            const updates = selectedServices.map(async (service) => {
                const professionalId = service.selectedProfessional; 
                const serviceTotal = service.price * service.quantity; 

                const professionalIndex = professionals.findIndex(p => p.id === professionalId);

                if (professionalIndex !== -1) {
                    const professional = professionals[professionalIndex];
                    const newBalance = parseFloat(professional.balance) + serviceTotal;

                    professionals[professionalIndex].balance = newBalance;

                    await updateDoc(boxDoc.ref, { professionals });

                    console.log(`Saldo atualizado para o profissional ID: ${professionalId}, Novo saldo: ${newBalance}`);
                } else {
                    console.error(`Profissional com ID ${professionalId} não encontrado no array de profissionais.`);
                }
            });

            await Promise.all(updates);

            onComplete();
        } catch (error) {
            console.error("Erro ao adicionar venda: ", error);
        }
    };


    const handleRemoveService = (serviceId) => {
        setSelectedServices((prev) => prev.filter(s => s.id !== serviceId));
    };

    const handleIncrementService = (serviceId) => {
        setSelectedServices((prev) => {
            return prev.map(s =>
                s.id === serviceId
                    ? { ...s, quantity: s.quantity + 1 }
                    : s
            );
        });
    };

    const handleDecrementService = (serviceId) => {
        setSelectedServices((prev) => {
            return prev.map(s =>
                s.id === serviceId
                    ? { ...s, quantity: s.quantity > 1 ? s.quantity - 1 : 1 }
                    : s
            );
        });
    };

    const handleProfessionalChange = (serviceId, professionalId) => {
        setSelectedServices((prev) =>
            prev.map(s =>
                s.id === serviceId
                    ? { ...s, selectedProfessional: professionalId } 
                    : s
            )
        );
    };


    useEffect(() => {
        calculateTotalPrice();
    }, [calculateTotalPrice]);

    const handleSubmit = (e) => {
        e.preventDefault();
        handleAddCompletion(e);
    };

    return (
        <div className={`modal-overlay modal-overlay-open`}>
            <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                <h2>Completar Venda</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>} 
                <form onSubmit={handleSubmit}>
                    <label>Método de Pagamento:</label>
                    <select onChange={(e) => setSelectedPaymentMethod(e.target.value)} value={selectedPaymentMethod} required>
                        <option value="">Selecione um método</option>
                        {paymentMethods.map(method => (
                            <option key={method.id} value={method.name}>{method.name}</option>
                        ))}
                    </select>

                    <label>Serviços:</label>
                    <select onChange={(e) => handleServiceChange(e.target.value)} required>
                        <option value="">Selecione um serviço</option>
                        {services.map(service => (
                            <option key={service.id} value={service.id}>
                                {service.name} - R$ {(service.price && service.price.toFixed(2)) || 'Preço não definido'}
                            </option>
                        ))}
                    </select>

                    <ul className="selected-services-list">
                        {selectedServices.map(service => (
                            <li key={service.id} className="service-item">
                                <div className="service-info">
                                    <div className="service-details">
                                        <span>{service.name} - R$ {service.price.toFixed(2)} x {service.quantity}</span>

                                        <label>Profissional:</label>
                                        <select
                                            onChange={(e) => handleProfessionalChange(service.id, e.target.value)}
                                            value={service.selectedProfessional}
                                            required
                                        >
                                            <option value="">Selecione um profissional</option>
                                            {professionals.map(professional => (
                                                <option key={professional.id} value={professional.id}>{professional.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="service-controls">
                                        <button type="button" className="decrement-btn" onClick={() => handleDecrementService(service.id)}>-</button>
                                        <button type="button" className="increment-btn" onClick={() => handleIncrementService(service.id)}>+</button>
                                        <button type="button" className="remove-btn" onClick={() => handleRemoveService(service.id)}>Remover</button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <p className="total-price">Total: R$ {totalPrice.toFixed(2)}</p>

                    <button type="submit">Finalizar Atendimento</button>
                    <button type="button" onClick={onCancel}>Fechar</button>
                </form>
            </div>
        </div>
    );
};

const EventComponent = ({ event }) => (
    <span>
        {event.title}{event.serviceName} 
    </span>
);

const Calendario = ({ events, professionals = [] }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [services, setServices] = useState([]);

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const paymentMethodsCollection = collection(db, 'paymentMethods');
                const snapshot = await getDocs(paymentMethodsCollection);
                const methods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPaymentMethods(methods);
            } catch (error) {
                console.error("Erro ao buscar métodos de pagamento:", error);
                setPaymentMethods([]);
            }
        };

        const fetchServices = async () => {
            try {
                const servicesCollection = collection(db, 'services');
                const snapshot = await getDocs(servicesCollection);
                const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setServices(servicesData);
            } catch (error) {
                console.error("Erro ao buscar serviços:", error);
                setServices([]);
            }
        };

        fetchPaymentMethods();
        fetchServices();
    }, []);

    const handleEventSelect = (event) => {
        setSelectedEvent(event);
        setIsCompleting(true);
    };

    const handleComplete = (completionData) => {
        console.log("Venda concluída:", completionData);
        setIsCompleting(false);
        setSelectedEvent(null);
    };

    const handleCancel = () => {
        setIsCompleting(false);
        setSelectedEvent(null);
    };

    const handleNavigate = (newDate) => {
        setSelectedDate(newDate);
    };

    return (
        <div className="calendar-layout">
            <div className="monthly-calendar">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 400, marginBottom: '20px', marginLeft: '10px' }}
                    step={30}
                    timeslots={1}
                    views={['month']}
                    defaultView="month"
                    min={new Date(1970, 1, 1, 8, 0, 0)}
                    max={new Date(1970, 1, 1, 20, 0, 0)}
                    resources={professionals}
                    resourceAccessor="resourceId"
                    resourceIdAccessor="id"
                    resourceTitleAccessor="title"
                    className="calendar"
                    onNavigate={handleNavigate}
                />
                <DailySalesSummary selectedDate={selectedDate} />
            </div>

            <div className="daily-calendar">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 500 }}
                    step={30}
                    timeslots={1}
                    views={['day']}
                    defaultView="day"
                    date={selectedDate}
                    min={new Date(1970, 1, 1, 8, 0, 0)}
                    max={new Date(1970, 1, 1, 22, 0, 0)}
                    resources={professionals}
                    resourceAccessor="resourceId"
                    resourceIdAccessor="id"
                    resourceTitleAccessor="title"
                    className="calendar"
                    onSelectEvent={handleEventSelect}
                    components={{
                        resourceHeader: CustomResourceHeader,
                        event: EventComponent  
                    }}
                    onNavigate={handleNavigate}
                />
            </div>

            {isCompleting && (
                <CompletionForm
                    selectedEvent={selectedEvent}
                    professionals={professionals}
                    paymentMethods={paymentMethods}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    services={services}
                />
            )}

            <div className='calendar-mobile'>
                <div className="monthly-calendar">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 400, marginBottom: '20px', marginLeft: '10px' }}
                        step={30}
                        timeslots={1}
                        views={['month']}
                        defaultView="month"
                        min={new Date(1970, 1, 1, 8, 0, 0)}
                        max={new Date(1970, 1, 1, 20, 0, 0)}
                        resources={professionals}
                        resourceAccessor="resourceId"
                        resourceIdAccessor="id"
                        resourceTitleAccessor="title"
                        className="calendar"
                        onNavigate={handleNavigate}
                    />
                    <div className="daily-calendar">
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 500 }}
                            step={30}
                            timeslots={1}
                            views={['day']}
                            defaultView="day"
                            date={selectedDate}
                            min={new Date(1970, 1, 1, 8, 0, 0)}
                            max={new Date(1970, 1, 1, 22, 0, 0)}
                            resources={professionals}
                            resourceAccessor="resourceId"
                            resourceIdAccessor="id"
                            resourceTitleAccessor="title"
                            className="calendar"
                            onSelectEvent={handleEventSelect}
                            components={{
                                resourceHeader: CustomResourceHeader,
                                event: EventComponent  
                            }}
                            onNavigate={handleNavigate}
                        />
                    </div>

                    {isCompleting && (
                        <CompletionForm
                            selectedEvent={selectedEvent}
                            professionals={professionals}
                            paymentMethods={paymentMethods}
                            onComplete={handleComplete}
                            onCancel={handleCancel}
                            services={services}
                        />
                    )}
                    <DailySalesSummary selectedDate={selectedDate} />
                    <br></br>
                    <br></br>
                    <br></br>
                    <br></br>
                </div>
            </div>
        </div>
    );
};

export default Calendario;