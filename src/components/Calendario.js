import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment-timezone';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../Styles/Calendario.css';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';

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

const CompletionForm = ({ selectedEvent, professionals, paymentMethods, onComplete, onCancel, services, onEventDeleted }) => {
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [products, setProducts] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    const handleRemoveEvent = async () => {
        if (selectedEvent && selectedEvent.id) {
            const confirmDelete = window.confirm("Tem certeza de que deseja remover este agendamento?");
            if (confirmDelete) {
                try {
                    console.log("Deletando agendamento com ID:", selectedEvent.id);

                    // Deleta o documento do Firestore
                    await deleteDoc(doc(db, "schedules", selectedEvent.id));

                    alert("Agendamento removido com sucesso.");

                    // Chama a função de callback passada para atualizar a lista de eventos no componente pai
                    onEventDeleted(selectedEvent.id); // Atualiza o estado no componente pai

                    // Fecha o modal ou o diálogo
                    onCancel();
                } catch (error) {
                    console.error("Erro ao remover agendamento:", error);

                    // Mostra uma mensagem de erro se a exclusão falhar
                    setErrorMessage("Não foi possível remover o agendamento. Tente novamente.");
                }
            }
        }
    };


    useEffect(() => {
        if (paymentMethods.length > 0) {
            setSelectedPaymentMethod(paymentMethods[0].name);
        }
    }, [paymentMethods]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "products"));
                const fetchedProducts = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setProducts(fetchedProducts);
            } catch (error) {
                console.error("Erro ao buscar produtos: ", error);
            }
        };

        fetchProducts();
    }, []);


    const calculateTotalPrice = useCallback(() => {
        const serviceTotal = selectedServices.reduce((total, service) => total + (service.price * service.quantity), 0);
        const productTotal = selectedProducts.reduce((total, product) => total + (product.salePrice * product.quantity), 0);
        setTotalPrice(serviceTotal + productTotal);
    }, [selectedServices, selectedProducts]);

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

    const handleProductChange = (productId) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setSelectedProducts((prev) => {
                const existingProduct = prev.find(p => p.id === product.id);
                if (existingProduct) {
                    const updatedProducts = prev.map(p =>
                        p.id === product.id
                            ? { ...p, quantity: p.quantity + 1 }
                            : p
                    );
                    return updatedProducts;
                } else {
                    const newProduct = { ...product, quantity: 1 };
                    return [...prev, newProduct];
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
            // Verifica se há um caixa aberto para o dia atual
            const todayDate = new Date().toLocaleDateString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).split('/').reverse().join('-'); // Formato YYYY-MM-DD
    
            const q = query(collection(db, "boxes"), where("date", "==", todayDate));
            const querySnapshot = await getDocs(q);
    
            if (querySnapshot.empty) {
                setErrorMessage('Não há caixa aberto para hoje. Não é possível concluir a venda.');
                return; // Impede que a venda seja concluída
            }
    
            // Se existir caixa aberto, continua com a lógica de concluir a venda
            if (selectedServices.length === 0 && selectedProducts.length === 0) {
                setErrorMessage('Pelo menos um serviço ou produto deve ser selecionado para completar a venda.');
                return;
            }
    
            // Verifica o estoque dos produtos
            for (const product of selectedProducts) {
                if (product.quantity > product.stock || product.stock === 0) {
                    setErrorMessage(`O produto "${product.name}" não possui estoque suficiente. Estoque disponível: ${product.stock}`);
                    return;
                }
            }
    
            const higherCommissionServices = [
                "Brow Lamination",
                "Sobrancelha com Henna",
                "Lash Lifting",
                "Make",
                "Sobrancelha com Refctocil"
            ];
    
            const processedServices = selectedServices.map(service => {
                const professional = professionals.find(prof => prof.id === service.selectedProfessional);
                const professionalName = professional?.title;
    
                const valorVenda = service.price * service.quantity;
                const custoTotal = (service.costPrice || 0) * service.quantity;
                let comissao = 0;
                let valorLiquido = valorVenda - custoTotal;
    
                let commissionRate;
                if (service.name === "Curso Automaquiagem 4h" || service.name === "Microblading 1 Sessão") {
                    commissionRate = 0.30;
                } else if (higherCommissionServices.includes(service.name)) {
                    commissionRate = 0.35;
                } else {
                    commissionRate = 0.45;
                }
    
                if (professionalName !== 'teste') {
                    comissao = commissionRate * valorLiquido;
                    valorLiquido -= comissao;
                }
    
                return {
                    ...service,
                    comissao,
                    valorLiquido,
                    originalSaleValue: valorVenda,
                    costPrice: service.costPrice || 0,
                    professionalId: service.selectedProfessional,
                    professionalName: professionalName || "Desconhecido",
                };
            });
    
            const processedProducts = [];
            for (const product of selectedProducts) {
                const professionalName = professionals.find(prof => prof.id === product.selectedProfessional)?.title;
    
                let valorBase = (product.salePrice - product.costPrice) * product.quantity;
                let comissao = 0;
                let valorLiquido = valorBase;
                const originalSaleValue = product.salePrice * product.quantity;
    
                if (professionalName !== 'teste') {
                    comissao = 0.85 * valorBase;
                    valorLiquido -= comissao;
                }
    
                const newStock = product.stock - product.quantity;
    
                if (newStock >= 0) {
                    await updateDoc(doc(db, "products", product.id), { stock: newStock });
                } else {
                    setErrorMessage(`O produto "${product.name}" não possui estoque suficiente. Estoque disponível: ${product.stock}`);
                    return;
                }
    
                processedProducts.push({
                    ...product,
                    valorTotal: originalSaleValue,
                    comissao,
                    valorLiquido,
                    originalSaleValue,
                    professionalId: product.selectedProfessional,
                    professionalName: professionalName || "Desconhecido",
                });
            }
    
            const totalPrice = processedServices.reduce((total, service) => total + (service.price * service.quantity), 0)
                + processedProducts.reduce((total, product) => total + (product.salePrice * product.quantity), 0);
    
            const netTotal = processedServices.reduce((total, service) => total + service.valorLiquido, 0)
                + processedProducts.reduce((total, product) => total + product.valorLiquido, 0);
    
            const vendaData = {
                event: selectedEvent,
                services: processedServices,
                products: processedProducts,
                paymentMethod: selectedPaymentMethod,
                totalPrice,
                netTotal,
            };
    
            const filteredVendaData = Object.fromEntries(
                Object.entries(vendaData).filter(([_, value]) => value !== undefined)
            );
    
            const vendaDoc = await addDoc(collection(db, "vendas"), filteredVendaData);
    
            console.log("Venda adicionada com sucesso: ", vendaDoc.id);
    
            const boxDoc = querySnapshot.docs[0];
            const boxData = boxDoc.data();
            const professionalsData = boxData.professionals || [];
    
            const professionalBalances = {};
            const lucasId = "MI4K0IIjF0hcPuv5w3GzXXX";
    
            processedServices.forEach(service => {
                const targetProfessionalId = selectedPaymentMethod === "Máquina do Colaborador" ? lucasId : service.professionalId;
    
                if (!professionalBalances[service.professionalId]) {
                    professionalBalances[service.professionalId] = { total: 0, originalSaleValue: 0 };
                }
                professionalBalances[service.professionalId].originalSaleValue += service.originalSaleValue;
    
                if (selectedPaymentMethod === "Máquina do Colaborador") {
                    if (!professionalBalances[lucasId]) {
                        professionalBalances[lucasId] = { total: 0, originalSaleValue: 0 };
                    }
                    professionalBalances[lucasId].total += service.comissao;
                } else {
                    professionalBalances[targetProfessionalId].total += service.valorLiquido;
                }
            });
    
            processedProducts.forEach(product => {
                const targetProfessionalId = selectedPaymentMethod === "Máquina do Colaborador" ? lucasId : product.professionalId;
    
                if (!professionalBalances[product.professionalId]) {
                    professionalBalances[product.professionalId] = { total: 0, originalSaleValue: 0 };
                }
                professionalBalances[product.professionalId].originalSaleValue += product.originalSaleValue;
    
                if (selectedPaymentMethod === "Máquina do Colaborador") {
                    if (!professionalBalances[lucasId]) {
                        professionalBalances[lucasId] = { total: 0, originalSaleValue: 0 };
                    }
                    professionalBalances[lucasId].total += product.comissao;
                } else {
                    professionalBalances[targetProfessionalId].total += product.valorLiquido;
                }
            });
    
            for (const professionalId of Object.keys(professionalBalances)) {
                const professionalIndex = professionalsData.findIndex(p => p.id === professionalId);
                if (professionalIndex !== -1) {
                    const professional = professionalsData[professionalIndex];
                    const newBalance = parseFloat(professional.balance || 0) + professionalBalances[professionalId].total;
    
                    professionalsData[professionalIndex].balance = newBalance;
                    professionalsData[professionalIndex].originalSaleValue = (professional.originalSaleValue || 0) + professionalBalances[professionalId].originalSaleValue;
    
                    await updateDoc(boxDoc.ref, { professionals: professionalsData });
    
                    console.log(`Saldo atualizado para o profissional ID: ${professionalId}, Novo saldo: ${newBalance}`);
                } else {
                    console.error(`Profissional com ID ${professionalId} não encontrado no array de profissionais.`);
                }
            }
    
            onComplete();
            window.location.reload();
        } catch (error) {
            console.error("Erro ao adicionar venda: ", error);
        }
    };
    

    const handleRemoveService = (serviceId) => {
        setSelectedServices((prev) => prev.filter(s => s.id !== serviceId));
    };

    const handleRemoveProduct = (productId) => {
        setSelectedProducts((prev) => prev.filter(p => p.id !== productId));
    };

    const handleIncrementProduct = (productId) => {
        setSelectedProducts((prev) => {
            return prev.map(p =>
                p.id === productId
                    ? { ...p, quantity: p.quantity + 1 }
                    : p
            );
        });
    };

    const handleDecrementProduct = (productId) => {
        setSelectedProducts((prev) => {
            return prev.map(p =>
                p.id === productId
                    ? { ...p, quantity: p.quantity > 1 ? p.quantity - 1 : 1 }
                    : p
            );
        });
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

    const handleProductProfessionalChange = (productId, professionalId) => {
        setSelectedProducts((prev) =>
            prev.map(p =>
                p.id === productId
                    ? { ...p, selectedProfessional: professionalId }
                    : p
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
                {selectedEvent && <h2 className="event-title">{selectedEvent.title}</h2>}
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <form onSubmit={handleSubmit}>
                    <label>Método de Pagamento:</label>
                    <select onChange={(e) => setSelectedPaymentMethod(e.target.value)} value={selectedPaymentMethod} required>
                        <option value="">Selecione um método</option>
                        {paymentMethods
                            .sort((a, b) => a.name.localeCompare(b.name)) // Ordena em ordem alfabética
                            .map(method => (
                                <option key={method.id} value={method.name}>{method.name}</option>
                            ))}
                    </select>


                    <label>Serviços:</label>
                    <select onChange={(e) => handleServiceChange(e.target.value)}>
                        <option value="">Selecione um serviço</option>
                        {services
                            .sort((a, b) => a.name.localeCompare(b.name)) // Ordena os serviços pelo nome
                            .map(service => (
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
                                        <button type="button" className="fecharbotao" onClick={() => handleRemoveService(service.id)}>Remover</button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <label>Produtos:</label>
                    <select onChange={(e) => handleProductChange(e.target.value)}>
                        <option value="">Selecione um produto</option>
                        {products.map(product => (
                            <option key={product.id} value={product.id}>
                                {product.name} - R$ {product.salePrice.toFixed(2)}
                            </option>
                        ))}
                    </select>

                    <ul className="selected-services-list">
                        {selectedProducts.map(product => (
                            <li key={product.id} className="service-item">
                                <div className="service-info">
                                    <div className="service-details">
                                        <span>{product.name} - R$ {product.salePrice.toFixed(2)} x {product.quantity}</span>

                                        <label>Profissional:</label>
                                        <select
                                            onChange={(e) => handleProductProfessionalChange(product.id, e.target.value)}
                                            value={product.selectedProfessional}
                                            required
                                        >
                                            <option value="">Selecione um profissional</option>
                                            {professionals.map(professional => (
                                                <option key={professional.id} value={professional.id}>{professional.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="service-controls">
                                        <button type="button" className="decrement-btn" onClick={() => handleDecrementProduct(product.id)}>-</button>
                                        <button type="button" className="increment-btn" onClick={() => handleIncrementProduct(product.id)}>+</button>
                                        <button type="button" className="fecharbotao" onClick={() => handleRemoveProduct(product.id)}>Remover</button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <p className="total-price">Total: R$ {totalPrice.toFixed(2)}</p>
                    <button
                        type="submit"
                        style={{
                            padding: '12px 20px',   // Aumenta o padding
                            fontSize: '16px',       // Aumenta o tamanho da fonte
                            borderRadius: '5px',    // Raio da borda para um visual mais arredondado
                            cursor: 'pointer',       // Muda o cursor para indicar que é clicável
                            color: 'white',         // Cor do texto
                            border: 'none',         // Remove a borda padrão
                        }}
                    >
                        Finalizar Atendimento
                    </button>
                    {selectedEvent && (<button type="button" className="fecharbotao" onClick={handleRemoveEvent}> Remover Agendamento </button>)}
                    <button type="button" className="fecharbotao" onClick={onCancel}>Fechar</button>
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
    const [currentEvents, setCurrentEvents] = useState(events); // Estado inicial

    useEffect(() => {
        // Atualiza currentEvents sempre que events mudar
        setCurrentEvents(events);
    }, [events]);

    const handleEventDeleted = (deletedEventId) => {
        setCurrentEvents(prevEvents => prevEvents.filter(event => event.id !== deletedEventId));
    };

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
    const handleSelectSlot = (slotInfo) => {
        setSelectedDate(slotInfo.start);
        setSelectedEvent(null);
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
            <br></br>
            <br></br>
            <br></br>
            <br></br>
            <div className="monthly-calendar">
                <Calendar
                    localizer={localizer}
                    events={currentEvents}
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
                    selectable={true}
                    onSelectSlot={handleSelectSlot}
                    components={{
                        event: () => null
                    }}
                    showAllEvents={true}
                    eventPropGetter={() => ({
                        style: {
                            backgroundColor: '#007BFF',
                        }
                    })}
                />
                <DailySalesSummary selectedDate={selectedDate} />
            </div>

            <div className="daily-calendar">
                <Calendar
                    localizer={localizer}
                    events={currentEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 500 }}
                    step={30}
                    timeslots={1}
                    views={['day']}
                    defaultView="day"
                    date={selectedDate}
                    min={new Date(1970, 1, 1, 8, 0, 0)}
                    max={new Date(1970, 1, 1, 21, 30, 0)}
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
                    onEventDeleted={handleEventDeleted}
                />
            )}

            <div className='calendar-mobile'>
                <br></br>
                <br></br>
                <div className="monthly-calendar">
                    <Calendar
                        localizer={localizer}
                        events={currentEvents}
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
                        selectable={true}
                        onSelectSlot={handleSelectSlot}
                        components={{
                            event: () => null
                        }}
                        showAllEvents={true}
                        eventPropGetter={() => ({
                            style: {
                                backgroundColor: '#007BFF',
                            }
                        })}
                    />
                    <div className="daily-calendar">
                        <Calendar
                            localizer={localizer}
                            events={currentEvents}
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
                            onEventDeleted={handleEventDeleted}
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