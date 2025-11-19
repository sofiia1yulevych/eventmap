// Globale Variablen
let map;
let markerLayer;
let allEvents = [];
let currentFilters = {
    date: 'all',
    category: 'all',
    search: ''
};
let eventMarkers = {};
let locationGroups = {}; // NEU: Gruppiert Events nach Standort

// Karte initialisieren
function initMap() {
    map = L.map('map').setView([50.775, 6.083], 14);

    // OSM Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Marker Layer Group
    markerLayer = L.layerGroup().addTo(map);
}

// Funktion zur Erstellung farbiger Icons
function createColoredIcon(color, highlighted = false) {
    const strokeWidth = highlighted ? 3 : 2;
    const strokeColor = highlighted ? '#000' : '#fff';

    return new L.Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
                <circle cx="16" cy="16" r="14" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
                <circle cx="16" cy="12" r="4" fill="#fff"/>
                <path d="M16 20 L10 28 L22 28 Z" fill="#fff"/>
            </svg>
        `)}`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
}

// NEU: Funktion zur Berechnung versetzter Positionen
function calculateOffsetPosition(lat, lng, index, total) {
    // Basis-Offset in Grad (etwa 10-20 Meter)
    const baseOffset = 0.0002;

    // Wenn nur ein Event, keine Versetzung
    if (total <= 1) {
        return { lat: lat, lng: lng };
    }

    // Verteile Marker im Kreis um die ursprüngliche Position
    const angle = (index * (2 * Math.PI)) / total;
    const radius = baseOffset * Math.min(total / 3, 2); // Radius basierend auf Anzahl

    const offsetLat = lat + (radius * Math.cos(angle));
    const offsetLng = lng + (radius * Math.sin(angle));

    return { lat: offsetLat, lng: offsetLng };
}

// Mapping von category_id zu Kategoriename, Farbe und Bild
const categoryMap = {
    1: { name: 'Sport', color: '#dc2626', image: '/images/Sport.jpg' },
    2: { name: 'Kunst', color: '#7c3aed', image: '/images/Kunst.jpeg' },
    3: { name: 'Musik', color: '#059669', image: '/images/Musik.jpg' },
    4: { name: 'Essen & Trinken', color: '#ea580c', image: '/images/Markt.jpg' },
    5: { name: 'Bildung', color: '#2563eb', image: '/images/Bildung.jpg' },
    6: { name: 'Kultur', color: '#9333ea', image: '/images/Kultur.jpg' },
    7: { name: 'Festival', color: '#f59e0b', image: '/images/Festival.jpg' },
    8: { name: 'Weihnachten', color: '#bde0fe', image: '/images/Weihnachten.jpg' },
    9: { name: 'Familie', color: '#ec4899', image: '/images/Familie.jpg' },
    10: { name: 'Andere', color: '#6b7280', image: null }
};

// Hilfsfunktion zur Kategorie-Bestimmung
function getCategoryInfo(event) {
    // Zuerst versuchen, aus der DB geladene Daten zu verwenden
    if (event.category_name && event.category_color) {
        return {
            name: event.category_name,
            color: event.category_color,
            image: event.category_image
        };
    }

    // Fallback: Aus category_id mappen
    const categoryId = event.category_id;
    return categoryMap[categoryId] || { name: 'Andere', color: '#6b7280', image: null };
}

// Events laden
function loadEvents() {
    fetch("get_events.php")
        .then(res => res.json())
        .then(events => {
            console.log("Geladene Events:", events);
            allEvents = events;
            applyFilters();
        })
        .catch(error => console.error('Fehler beim Laden der Events:', error));
}

// NEU: Verbesserte Marker-Funktion mit versetzten Positionen
function addMarkersToMap(events) {
    markerLayer.clearLayers();
    eventMarkers = {};
    locationGroups = {}; // Reset location groups

    // Zuerst Events nach Standort gruppieren
    events.forEach(event => {
        if (event.latitude && event.longitude) {
            const locationKey = `${event.latitude.toFixed(6)},${event.longitude.toFixed(6)}`;

            if (!locationGroups[locationKey]) {
                locationGroups[locationKey] = [];
            }
            locationGroups[locationKey].push(event);
        }
    });

    // Dann Marker für jede Gruppe erstellen
    Object.keys(locationGroups).forEach(locationKey => {
        const eventsAtLocation = locationGroups[locationKey];
        const baseLat = parseFloat(locationKey.split(',')[0]);
        const baseLng = parseFloat(locationKey.split(',')[1]);

        eventsAtLocation.forEach((event, index) => {
            // Berechne versetzte Position für diesen Marker
            const offsetPosition = calculateOffsetPosition(
                baseLat,
                baseLng,
                index,
                eventsAtLocation.length
            );

            const categoryInfo = getCategoryInfo(event);
            const icon = createColoredIcon(categoryInfo.color);

            const marker = L.marker([offsetPosition.lat, offsetPosition.lng], { icon: icon })
                .addTo(markerLayer)
                .bindPopup(`
                    <div class="popup-content">
                        <b>${event.name}</b><br>
                        <span class="popup-category" style="color: ${categoryInfo.color}">
                            ${categoryInfo.name}
                        </span><br>
                        <small>${formatDate(event.start_date)}</small><br>
                        ${event.description || ''}
                    </div>
                `)
                .on('click', function() {
                    highlightEventInList(event.id);
                    highlightEventOnMap(event.id);
                });

            // Marker in globaler Variable speichern
            eventMarkers[event.id] = marker;
        });
    });
}

// NEU: Marker auf der Karte hervorheben und zentrieren
function highlightEventOnMap(eventId) {
    const marker = eventMarkers[eventId];
    if (marker) {
        // Karte zum Marker zentrieren
        map.setView(marker.getLatLng(), 16);

        // Popup öffnen
        marker.openPopup();

        // Marker vorübergehend hervorheben
        const event = allEvents.find(e => e.id == eventId);
        const categoryInfo = getCategoryInfo(event);
        marker.setIcon(createColoredIcon(categoryInfo.color, true));

        // Nach 3 Sekunden zurücksetzen
        setTimeout(() => {
            marker.setIcon(createColoredIcon(categoryInfo.color, false));
        }, 3000);
    }
}

// NEU: Hilfsfunktion für Wochenberechnung (Montag bis Sonntag)
function getWeekRange(weekOffset = 0) {
    const today = new Date();
    const currentDay = today.getDay();

    // Montag als Wochenstart (0 = Sonntag, 1 = Montag, ... 6 = Samstag)
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
}

// NEU: Hilfsfunktion für Monatsberechnung
function getMonthRange(monthOffset = 0) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + monthOffset;

    // Ersten Tag des Monats
    const startOfMonth = new Date(year, month, 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Letzten Tag des Monats
    const endOfMonth = new Date(year, month + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    return { start: startOfMonth, end: endOfMonth };
}

// NEU: Verbesserter Datumsfilter mit korrekten Wochen und Monaten
function filterByDate(event, filterType) {
    if (filterType === 'all') return true;

    const eventDate = new Date(event.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch(filterType) {
        case 'today':
            return eventDate.toDateString() === today.toDateString();

        case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return eventDate.toDateString() === tomorrow.toDateString();

        case 'week': // Diese Woche (Mo-So)
            const thisWeek = getWeekRange(0);
            return eventDate >= thisWeek.start && eventDate <= thisWeek.end;

        case 'next_week': // Nächste Woche (Mo-So)
            const nextWeek = getWeekRange(1);
            return eventDate >= nextWeek.start && eventDate <= nextWeek.end;

        case 'this_month': // Dieser Monat (vom 1. bis letzten Tag)
            const thisMonth = getMonthRange(0);
            return eventDate >= thisMonth.start && eventDate <= thisMonth.end;

        case 'next_month': // Nächster Monat (vom 1. bis letzten Tag)
            const nextMonth = getMonthRange(1);
            return eventDate >= nextMonth.start && eventDate <= nextMonth.end;

        default:
            return true;
    }
}

// Filter anwenden
function applyFilters() {
    let filteredEvents = allEvents.filter(event => {
        // Datumsfilter
        if (!filterByDate(event, currentFilters.date)) return false;

        // Kategoriefilter
        if (!filterByCategory(event, currentFilters.category)) return false;

        // Suchfilter
        if (!filterBySearch(event, currentFilters.search)) return false;

        return true;
    });

    displayEvents(filteredEvents);
    addMarkersToMap(filteredEvents);
    updateResultsCount(filteredEvents.length);
}

// Kategoriefilter
function filterByCategory(event, categoryId) {
    if (categoryId === 'all') return true;
    return event.category_id == categoryId;
}

// Suchfilter
function filterBySearch(event, searchTerm) {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const categoryInfo = getCategoryInfo(event);

    return (
        event.name.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.place_name.toLowerCase().includes(searchLower) ||
        categoryInfo.name.toLowerCase().includes(searchLower)
    );
}

// NEU: Verbesserte Datumsformatierung mit "Heute" und "Morgen"
function formatEventDate(dateString) {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (eventDate.toDateString() === today.toDateString()) {
        return { dayString: 'Heute', month: '' };
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
        return { dayString: 'Morgen', month: '' };
    } else {
        return {
            dayString: eventDate.getDate().toString(),
            month: eventDate.toLocaleDateString('de-DE', { month: 'short' })
        };
    }
}

// Events anzeigen mit verbesserter Datumsanzeige
function displayEvents(events) {
    const container = document.getElementById('events-container');
    if (!container) {
        console.error('Container #events-container nicht gefunden!');
        return;
    }

    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<div class="no-events">Keine Veranstaltungen gefunden.</div>';
        return;
    }

    events.forEach(event => {
        const div = document.createElement("div");
        div.className = "event";
        div.setAttribute('data-event-id', event.id);

        const dateInfo = formatEventDate(event.start_date);
        const startTime = formatTime(event.start_time);
        const endTime = formatTime(event.end_time);
        const categoryInfo = getCategoryInfo(event);

        // Kategorie-Bild verwenden
        const imageHtml = categoryInfo.image ?
            `<div class="image-container">
                <img src="${categoryInfo.image}" alt="${categoryInfo.name}" onerror="this.style.display='none'">
            </div>` :
            '';

        // Zeit-Informationen
        let timeInfo = '';
        if (startTime && endTime) {
            timeInfo = `<p class="event-time">🕑 ${startTime} - ${endTime} Uhr</p>`;
        } else if (startTime) {
            timeInfo = `<p class="event-time">🕑 ${startTime} Uhr</p>`;
        }

        div.innerHTML = `
            <div class="event-header">
                <div class="date-title">
                    <div class="event-date">
                        <div class="event-day">${dateInfo.dayString}${dateInfo.month ? '.' : ''}</div>
                        ${dateInfo.month ? `<div class="event-month">${dateInfo.month}</div>` : ''}
                    </div>
                    <div class="title-category">
                        <h3 class="event-title">${event.name}</h3>
                        <div class="event-category">
                            <span class="category-badge" style="background-color: ${categoryInfo.color}; padding: 0 3px; border-radius: 2px;">
                                ${categoryInfo.name}
                            </span>
                        </div>
                        <div class="event-details">
                            <p class="event-description">${event.description || ""}</p>
                            <div class="event-meta">
                                <p class="event-location">📍 ${event.place_name || ''}</p>
                                <p>${timeInfo}</p>
                            </div>
                        </div>
                    </div>
                </div>
                ${imageHtml}
            </div>
        `;

        // NEU: Verbessertes Klick-Event für Event in der Liste
        div.addEventListener('click', function() {
            highlightEventOnMap(event.id);
            highlightEventInList(event.id);
        });

        container.appendChild(div);
    });
}

// Datum formatieren
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(timeString) {
    if (!timeString) return '';
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Ergebnisse-Zähler aktualisieren
function updateResultsCount(count) {
    const title = document.querySelector('#event-list h2');
    if (title) {
        title.textContent = `Veranstaltungen (${count})`;
    }
}

// Event-Listener
function initEventListeners() {
    // Datumsfilter
    const dateFilter = document.getElementById('date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            currentFilters.date = this.value;
            applyFilters();
        });
    }

    // Kategoriefilter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentFilters.category = this.value;
            applyFilters();
        });
    }

    // Suchfunktion
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });
    }

    // Filter zurücksetzen
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (dateFilter) dateFilter.value = 'all';
            if (categoryFilter) categoryFilter.value = 'all';
            if (searchInput) searchInput.value = '';
            currentFilters = { date: 'all', category: 'all', search: '' };
            applyFilters();
        });
    }
}

// Suche ausführen
function performSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const searchTerm = searchInput.value.trim();
        currentFilters.search = searchTerm;
        applyFilters();
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initEventListeners();
    loadEvents();
});

// Live-Suche
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');

if (searchButton && searchInput) {
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('input', function() {
        performSearch();
    });
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
}

// Filter zurücksetzen
const resetButton = document.getElementById('reset-filters');
if (resetButton) {
    resetButton.addEventListener('click', function() {
        const dateFilter = document.getElementById('date-filter');
        const categoryFilter = document.getElementById('category-filter');
        const searchInput = document.getElementById('search-input');

        if (dateFilter) dateFilter.value = 'all';
        if (categoryFilter) categoryFilter.value = 'all';
        if (searchInput) searchInput.value = '';

        currentFilters = { date: 'all', category: 'all', search: '' };
        applyFilters();
    });
}

// Event in der Liste hervorheben und scrollen
function highlightEventInList(eventId) {
    const eventsContainer = document.getElementById('events-container');
    const eventElements = eventsContainer.getElementsByClassName('event');

    // Alte Hervorhebungen entfernen
    Array.from(eventElements).forEach(eventElement => {
        eventElement.classList.remove('event-highlighted');
    });

    // Neues Event finden und hervorheben
    Array.from(eventElements).forEach(eventElement => {
        const elementEventId = eventElement.getAttribute('data-event-id');
        if (elementEventId == eventId) {
            eventElement.classList.add('event-highlighted');

            // Zum Event scrollen
            eventElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Hervorhebung nach 3 Sekunden entfernen
            setTimeout(() => {
                eventElement.classList.remove('event-highlighted');
            }, 3000);
        }
    });
}