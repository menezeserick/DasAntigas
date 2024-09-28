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
    const [professionals, setProfessionals] = useState([]);
    const [services, setServices] = useState([]);
    const [paymentMethods] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        professional: '',
        date: '',
        time: ''
    });

    const openModal = () => setModalIsOpen(true);
    const closeModal = () => setModalIsOpen(false);
    const openProfessionalModal = () => setModalProfessionalOpen(true);
    const closeProfessionalModal = () => setModalProfessionalOpen(false);
    const openServiceModal = () => setModalServiceOpen(true);
    const closeServiceModal = () => setModalServiceOpen(false);

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
            title: `${formData.title} - ${formData.professional}`,
            start: start,
            end: end,
            resourceId: professional.id
        };

        try {
            await addDoc(collection(db, "schedules"), {
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

        try {
            await addDoc(collection(db, "services"), { name: serviceName });
            setServices([...services, { name: serviceName }]);
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
                        title: `${data.service} - ${data.professional}`,
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
        for (let i = 0; i < 24; i++) {
            for (let j = 0; j < 60; j += 30) {
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
                            <label>Preço:</label>
                            <input type="number" name="servicePrice" step="0.01" required />
                            <button type="submit">Adicionar</button>
                            <button type="button" onClick={closeServiceModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
export default Dashboard;

