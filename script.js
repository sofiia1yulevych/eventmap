// Globale Variablen
let map;
let markerLayer;
let allEvents = [];
let currentFilters = {
    date: 'all',
    category: 'all',
    search: ''
};

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
function createColoredIcon(color) {
    return new L.Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
                <circle cx="16" cy="16" r="14" fill="${color}" stroke="#fff" stroke-width="2"/>
                <circle cx="16" cy="12" r="4" fill="#fff"/>
                <path d="M16 20 L10 28 L22 28 Z" fill="#fff"/>
            </svg>
        `)}`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
}

// Mapping von category_id zu Kategoriename und Farbe (Fallback falls DB nicht korrekt joined)
const categoryMap = {
    1: { name: 'Sport', color: '#dc2626' },
    2: { name: 'Kunst', color: '#7c3aed' },
    3: { name: 'Musik', color: '#059669' },
    4: { name: 'Essen & Trinken', color: '#ea580c' },
    5: { name: 'Bildung', color: '#2563eb' },
    6: { name: 'Kultur', color: '#9333ea' },
    7: { name: 'Festival', color: '#f59e0b' },
    8: { name: 'Weihnachten', color: '#16a34a' },
    9: { name: 'Familie', color: '#ec4899' },
    10: { name: 'Andere', color: '#6b7280' }
};

// Hilfsfunktion zur Kategorie-Bestimmung
function getCategoryInfo(event) {
    // Zuerst versuchen, aus der DB geladene Daten zu verwenden
    if (event.category_name && event.category_color) {
        return {
            name: event.category_name,
            color: event.category_color
        };
    }

    // Fallback: Aus category_id mappen
    const categoryId = event.category_id;
    return categoryMap[categoryId] || { name: 'Andere', color: '#6b7280' };
}

// Events laden
function loadEvents() {
    fetch("get_events.php")
        .then(res => res.json())
        .then(events => {
            console.log("Geladene Events:", events); // Debug-Ausgabe
            allEvents = events;
            applyFilters();
        })
        .catch(error => console.error('Fehler beim Laden der Events:', error));
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

// Datumsfilter
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
        case 'week':
            const endOfWeek = new Date(today);
            endOfWeek.setDate(endOfWeek.getDate() + 7);
            return eventDate >= today && eventDate <= endOfWeek;
        case 'month':
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return eventDate >= today && eventDate <= endOfMonth;
        default:
            return true;
    }
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

// Events anzeigen
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

        // Bild-HTML falls vorhanden
        const imageHtml = event.image ?
            `<div class="image-container">
        <img src="${event.image}" alt="${event.name}" onerror="this.style.display='none'">
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
                    <div class="event-day">${dateInfo.day}.</div>
                    <div class="event-month">${dateInfo.month}</div>
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

            </div>
        `;

        // Klick-Event für Event in der Liste
        div.addEventListener('click', function() {
            highlightEventInList(event.id);
            highlightMarkerOnMap(event.id);
        });

        container.appendChild(div);
    });
}

// Neue Hilfsfunktion für Datumsformatierung
function formatEventDate(dateString) {
    const date = new Date(dateString);
    return {
        day: date.getDate().toString(),
        month: date.toLocaleDateString('de-DE', { month: 'short' })
    };
}


// Datum formatieren
// Nur Datum formatieren (ohne Zeit)
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
    // TIME-Format (HH:MM:SS) zu lesbarer Zeit konvertieren
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


// Suchfilter - NUR nach Veranstaltungsnamen
function filterBySearch(event, searchTerm) {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return event.name.toLowerCase().includes(searchLower);
}

// Suchfunktion
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');

if (searchButton && searchInput) {
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('input', function() {
        // Live-Suche bei jeder Eingabe
        performSearch();
    });
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
}

// Suche ausführen


// Filter zurücksetzen
const resetButton = document.getElementById('reset-filters');
if (resetButton) {
    resetButton.addEventListener('click', function() {
        if (dateFilter) dateFilter.value = 'all';
        if (categoryFilter) categoryFilter.value = 'all';
        if (searchInput) searchInput.value = ''; // Suchfeld zurücksetzen

        // Custom-Date-Container zurücksetzen
        const customDateContainer = document.getElementById('custom-date-container');
        if (customDateContainer) {
            customDateContainer.style.display = 'none';
        }
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';

        currentFilters = { date: 'all', category: 'all', search: '' };
        applyFilters();
    });
}


// Marker zur Karte hinzufügen - ERWEITERT
function addMarkersToMap(events) {
    markerLayer.clearLayers();

    events.forEach(event => {
        if (event.latitude && event.longitude) {
            const categoryInfo = getCategoryInfo(event);
            const icon = createColoredIcon(categoryInfo.color);

            const marker = L.marker([event.latitude, event.longitude], { icon: icon })
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
                    // Beim Klick auf Marker Event in der Liste hervorheben
                    highlightEventInList(event.id);
                });
        }
    });
}

// Event in der Liste hervorheben und scrollen
function highlightEventInList(eventId) {
    const eventsContainer = document.getElementById('events-container');
    const eventElements = eventsContainer.getElementsByClassName('event');

    // Alte Hervorhebungen entfernen
    Array.from(eventElements).forEach(eventElement => {
        eventElement.classList.remove('event-highlighted');
        // Event-ID aus data-attribut entfernen falls vorhanden
        eventElement.removeAttribute('data-event-id');
    });

    // Neues Event finden und hervorheben
    Array.from(eventElements).forEach(eventElement => {
        // Prüfen ob dieses Element das gesuchte Event ist
        const eventName = eventElement.querySelector('h3')?.textContent;
        const targetEvent = allEvents.find(e => e.id == eventId);

        if (targetEvent && eventName === targetEvent.name) {
            // Event-ID speichern
            eventElement.setAttribute('data-event-id', eventId);
            eventElement.classList.add('event-highlighted');

            // Zum Event scrollen
            eventElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            setTimeout(() => {
                eventElement.classList.remove('event-highlighted');
            }, 3000);
        }
    });
}