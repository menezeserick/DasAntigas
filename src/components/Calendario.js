import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment-timezone';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../Styles/Calendario.css';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const localizer = momentLocalizer(moment.tz.setDefault("America/Sao_Paulo"));
moment.locale('pt-br');

const CustomResourceHeader = ({ label }) => (
    <div className="custom-resource-header">
        {label}
    </div>
);

const CompletionForm = ({ selectedEvent, professionals, paymentMethods, onComplete, onCancel, services }) => {
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedProfessional, setSelectedProfessional] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [totalPrice, setTotalPrice] = useState(0);

    useEffect(() => {
        if (paymentMethods.length > 0) {
            setSelectedPaymentMethod(paymentMethods[0].name);
        }
    }, [paymentMethods]);

    const calculateTotalPrice = useCallback(() => {
        const total = selectedServices.reduce((total, service) => total + (service.price * service.quantity), 0);
        setTotalPrice(total);
    }, [selectedServices]); // Aqui incluímos selectedServices como dependência

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
                    const newService = { ...service, quantity: 1 };
                    return [...prev, newService];
                }
            });
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

    useEffect(() => {
        calculateTotalPrice(); // Chama a função de cálculo
    }, [calculateTotalPrice]); // Inclui calculateTotalPrice como dependência

    const handleSubmit = (e) => {
        e.preventDefault();
        const completionData = {
            event: selectedEvent,
            professional: selectedProfessional,
            paymentMethod: selectedPaymentMethod,
            services: selectedServices,
            totalPrice,
        };
        onComplete(completionData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label>Profissional:</label>
            <select onChange={(e) => setSelectedProfessional(e.target.value)} required>
                <option value="">Selecione um profissional</option>
                {professionals.map(professional => (
                    <option key={professional.id} value={professional.title}>{professional.title}</option>
                ))}
            </select>

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

            {/* Lista de serviços selecionados */}
            <ul>
                {selectedServices.map(service => (
                    <li key={service.id}>
                        {service.name} - R$ {service.price.toFixed(2)} x {service.quantity}
                        <button type="button" onClick={() => handleDecrementService(service.id)}>-</button>
                        <button type="button" onClick={() => handleIncrementService(service.id)}>+</button>
                        <button type="button" onClick={() => handleRemoveService(service.id)}>Remover</button>
                    </li>
                ))}
            </ul>

            <p>Total: R$ {totalPrice.toFixed(2)}</p>
            <button type="submit">Finalizar Atendimento</button>
            <button type="button" onClick={onCancel}>Fechar</button>
        </form>
    );
};


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
        // Aqui você pode salvar os dados no banco de dados se necessário
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
                    style={{ height: 400, marginBottom: '20px' }}
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
                    max={new Date(1970, 1, 1, 20, 0, 0)}
                    resources={professionals}
                    resourceAccessor="resourceId"
                    resourceIdAccessor="id"
                    resourceTitleAccessor="title"
                    components={{
                        resourceHeader: CustomResourceHeader
                    }}
                    className="calendar"
                    onSelectEvent={handleEventSelect}
                    onNavigate={handleNavigate}
                />
            </div>

            {isCompleting && selectedEvent && services.length > 0 && paymentMethods.length > 0 && professionals.length > 0 && (
                <div className={`modal-overlay modal-overlay-open`} onClick={handleCancel}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Concluir Atendimento</h2>
                        <CompletionForm
                            selectedEvent={selectedEvent}
                            professionals={professionals}
                            paymentMethods={paymentMethods}
                            services={services}
                            onComplete={handleComplete}
                            onCancel={handleCancel}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendario;
