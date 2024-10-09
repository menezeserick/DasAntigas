import React, { useState, useEffect } from 'react';
import Calendario from '../components/Calendario';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../Styles/Dashboard.css';
import moment from 'moment-timezone';
import Header from '../components/Header';

const Dashboard = () => {
    const [events, setEvents] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [modalProfessionalOpen, setModalProfessionalOpen] = useState(false);
    const [modalServiceOpen, setModalServiceOpen] = useState(false);
    // eslint-disable-next-line
    const [modalRegisterOpen, setModalRegisterOpen] = useState(false);
    const [modalRegisterBoxOpen, setModalRegisterBoxOpen] = useState(false); // Adicionando o estado para o modal de caixa
    const [professionals, setProfessionals] = useState([]);
    const [services, setServices] = useState([]);
    const [paymentMethods] = useState([]);
    const [professionalBalances, setProfessionalBalances] = useState([]);
    const [formData, setFormData] = useState({
        clientName: '',  
        title: '',
        professional: '',
        date: '',
        time: ''
    });

    // Funções para abrir e fechar o modal de caixa
    const openRegisterBoxModal = () => setModalRegisterBoxOpen(true);
    // eslint-disable-next-line
    const closeRegisterBoxModal = () => setModalRegisterBoxOpen(false);

    const openModal = () => setModalIsOpen(true);
    const closeModal = () => setModalIsOpen(false);
    const openProfessionalModal = () => setModalProfessionalOpen(true);
    const closeProfessionalModal = () => setModalProfessionalOpen(false);
    const openServiceModal = () => setModalServiceOpen(true);
    // eslint-disable-next-line
    const closeServiceModal = () => setModalServiceOpen(false);
    // eslint-disable-next-line
    const openRegisterModal = () => setModalRegisterOpen(true);
    // eslint-disable-next-line
    const closeRegisterModal = () => setModalRegisterOpen(false);

    // Função que será chamada ao abrir o caixa
    const handleOpenBox = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "vendas"));
            const professionalBalances = {};
    
            // Log de profissionais
            const professionalsSnapshot = await getDocs(collection(db, "professionals"));
            const professionalsNames = professionalsSnapshot.docs.map(doc => doc.data().name);
            console.log("Profissionais disponíveis:", professionalsNames); // Log dos nomes dos profissionais
    
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const professionalName = data.selectedProfessional; // Nome do profissional
                const totalPrice = parseFloat(data.totalPrice); // Usa o totalPrice diretamente
    
                // Verifica se o totalPrice e o professionalName são válidos
                if (!isNaN(totalPrice) && professionalName) {
                    // Normaliza o nome do profissional
                    const normalizedProfessionalName = professionalName.trim();
    
                    if (!professionalBalances[normalizedProfessionalName]) {
                        professionalBalances[normalizedProfessionalName] = 0; // Inicializa se não existir
                    }
                    professionalBalances[normalizedProfessionalName] += totalPrice; // Atualiza o saldo
                } else {
                    // Mensagem detalhada de erro
                    if (isNaN(totalPrice)) {
                        console.warn(`Preço total inválido: ${data.totalPrice} (ID da venda: ${doc.id})`);
                    }
                    if (!professionalName) {
                        console.warn(`Profissional não encontrado para a venda: ${data.totalPrice} (ID da venda: ${doc.id})`);
                    }
                }
            });
    
            // Converte o objeto para um array
            const balancesList = Object.keys(professionalBalances).map(name => ({
                name: name,
                balance: professionalBalances[name]
            }));
    
            setProfessionalBalances(balancesList);
        } catch (error) {
            console.error("Erro ao abrir o caixa: ", error);
        }
    };
    
    
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const [hours, minutes] = formData.time.split(":");
        const start = moment.tz(`${formData.date} ${hours}:${minutes}`, "YYYY-MM-DD HH:mm", "America/Sao_Paulo").toDate();
        const end = moment(start).add(30, 'minutes').toDate();
    
        const professional = professionals.find(p => p.title === formData.professional);
        if (!professional) {
            console.error("Profissional não encontrado!");
            return;
        }
    
        const newEvent = {
            title: `${formData.clientName} - ${formData.title}`,
            start: start,
            end: end,
            resourceId: professional.id
        };
    
        try {
            await addDoc(collection(db, "schedules"), {
                clientName: formData.clientName,  
                service: formData.title,
                professional: formData.professional,
                date: formData.date,
                time: formData.time
            });
    
            setEvents((prevEvents) => [...prevEvents, newEvent]);
            closeModal();
        } catch (error) {
            console.error("Erro ao adicionar agendamento: ", error);
        }
    };
    

    const handleAddProfessional = async (e) => {
        e.preventDefault();
        const name = e.target.professionalName.value;

        try {
            await addDoc(collection(db, "professionals"), { name });
            const newProfessional = { id: professionals.length + 1, title: name };
            setProfessionals([...professionals, newProfessional]);
            closeProfessionalModal();
        } catch (error) {
            console.error("Erro ao adicionar profissional: ", error);
        }
    };

    const handleAddService = async (e) => {
        e.preventDefault();
    
        const serviceName = e.target.serviceName.value;
        const servicePrice = parseFloat(e.target.servicePrice.value); 
    
        if (!serviceName || !servicePrice) {
            console.error("Nome ou preço do serviço estão ausentes.");
            return;
        }   
        try {
            await addDoc(collection(db, "services"), {
                name: serviceName,
                price: servicePrice,
            });
            setServices([...services, { name: serviceName, price: servicePrice }]);
            closeServiceModal();
        } catch (error) {
            console.error("Erro ao adicionar serviço: ", error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "professionals"));
                const firestoreProfessionals = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    title: doc.data().name,
                }));
                setProfessionals(firestoreProfessionals);

                const serviceSnapshot = await getDocs(collection(db, "services"));
                const firestoreServices = serviceSnapshot.docs.map(doc => ({
                    name: doc.data().name,
                }));
                setServices(firestoreServices);
            } catch (error) {
                console.error("Erro ao buscar os dados: ", error);
            }
        };

        fetchData();
    }, []);


    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "schedules"));
                const firestoreEvents = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const start = moment.tz(`${data.date} ${data.time}`, "YYYY-MM-DD HH:mm", "America/Sao_Paulo").toDate();
                    const end = moment(start).add(30, 'minutes').toDate();
    
                    return {
                        title: `${data.clientName} - ${data.service}`,
                        start: start,
                        end: end,
                        resourceId: professionals.find(p => p.title === data.professional)?.id
                    };
                });
                setEvents(firestoreEvents);
            } catch (error) {
                console.error("Erro ao buscar os dados: ", error);
            }
        };
    
        fetchData();
    }, [professionals]);

    const generateTimeOptions = () => {
        const options = [];
        for (let i = 8; i <= 20; i++) {
            for (let j = 0; j < 60; j += 30) {
                if (i === 20 && j > 30) break;
                const hours = String(i).padStart(2, '0');
                const minutes = String(j).padStart(2, '0');
                options.push(`${hours}:${minutes}`);
            }
        }
        return options;
    };

    return (
        <div className="container">
            <Header
                openScheduleModal={openModal}
                openProfessionalModal={openProfessionalModal}
                openServiceModal={openServiceModal}
                openRegisterBoxModal={openRegisterBoxModal}
            />

            <Calendario
                events={events}
                setEvents={setEvents}
                professionals={professionals}
                paymentMethods={paymentMethods} 
            />

            {modalIsOpen && (
                <div className={`modal-overlay modal-overlay-open`} onClick={closeModal}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Agendar Cliente</h2>
                        <form onSubmit={handleFormSubmit}>
                            <label>Nome do Cliente:</label>
                            <input type="text" name="clientName" onChange={handleInputChange} required /> 
                            <label>Serviço:</label>
                            <select name="title" onChange={handleInputChange} required>
                                <option value="">Selecione um serviço</option>
                                {services.map((service, index) => (
                                    <option key={index} value={service.name}>{service.name}</option>
                                ))}
                            </select>
                            <label>Profissional:</label>
                            <select name="professional" onChange={handleInputChange} required>
                                <option value="">Selecione um profissional</option>
                                {professionals.map((professional) => (
                                    <option key={professional.id} value={professional.title}>{professional.title}</option>
                                ))}
                            </select>
                            <label>Data:</label>
                            <input type="date" name="date" onChange={handleInputChange} required />
                            <label>Hora:</label>
                            <select name="time" onChange={handleInputChange} required>
                                <option value="">Selecione uma hora</option>
                                {generateTimeOptions().map((time, index) => (
                                    <option key={index} value={time}>{time}</option>
                                ))}
                            </select>
                            <button type="submit">Agendar</button>
                            <button type="button" onClick={closeModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

            {modalProfessionalOpen && (
                <div className={`modal-overlay modal-overlay-open`} onClick={closeProfessionalModal}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Adicionar Profissional</h2>
                        <form onSubmit={handleAddProfessional}>
                            <label>Nome do Profissional:</label>
                            <input type="text" name="professionalName" required />
                            <button type="submit">Adicionar</button>
                            <button type="button" onClick={closeProfessionalModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

            {modalServiceOpen && (
                <div className={`modal-overlay modal-overlay-open`} onClick={closeServiceModal}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Adicionar Serviço</h2>
                        <form onSubmit={handleAddService}>
                            <label>Nome do Serviço:</label>
                            <input type="text" name="serviceName" required />
                            <label>Preço do Serviço:</label>
                            <input type="number" step="0.01" name="servicePrice" required />
                            <button type="submit">Adicionar</button>
                            <button type="button" onClick={closeServiceModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}
            {modalRegisterBoxOpen && (
                <div className={`modal-overlay modal-overlay-open`} onClick={handleOpenBox}>
                    <div className="modal modal-open large-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Caixa</h2>
                        {professionalBalances.map((prof, index) => (
                            <div key={index}>
                                <span>{prof.name}: </span>
                                <span>R$ {prof.balance.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
export default Dashboard;

