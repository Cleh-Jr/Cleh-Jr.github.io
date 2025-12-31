// Proxy para contornar bloqueio da Steam e permitir busca pelo navegador
const CORS_PROXY = "https://corsproxy.io/?";

// Cache para não pesquisar o mesmo ID duas vezes
const steamIdCache = {};

document.addEventListener('DOMContentLoaded', () => {
    renderLibrary();
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });
});

// --- FUNÇÃO DE BUSCA E LIMPEZA DE NOME ---
async function fetchSteamId(gameName) {
    if (steamIdCache[gameName]) return steamIdCache[gameName];

    // Regex Poderoso: Remove edições especiais para facilitar a busca
    let cleanName = gameName
        .replace(/Game of the Year Edition|Game of the Year|GOTY|Definitive Edition|Director's Cut|Gold Edition|Special Edition|Ultimate Edition|Complete Edition|Deluxe Edition|Anniversary Edition/gi, '')
        .replace(/\(.*\)|\[.*\]/g, '') // Remove coisas entre parênteses
        .replace(/™|®|©|:/g, '')       // Remove símbolos
        .replace(/\s+/g, ' ')          // Remove espaços duplos
        .trim();

    try {
        const searchUrl = `${CORS_PROXY}https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanName)}&l=brazilian&cc=BR`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.total > 0 && data.items[0]) {
            steamIdCache[gameName] = data.items[0].id;
            return data.items[0].id;
        }
    } catch (e) {
        console.error(`Erro buscando ID para: ${cleanName}`);
    }
    return null;
}

// --- RENDERIZAÇÃO DA BIBLIOTECA ---
function renderLibrary(filter = "") {
    const container = document.getElementById('libraryContainer');
    container.innerHTML = '';

    const storeOrder = ["Steam", "Steam Family Sharing", "Epic Games", "EA App", "Ubisoft Connect", "GOG", "Battle.net", "Amazon Games", "RobotCache"];

    const grouped = gamesData.reduce((acc, game) => {
        const store = game.Fontes || "Outros";
        if (!acc[store]) acc[store] = [];
        acc[store].push(game);
        return acc;
    }, {});

    const sortedStores = Object.keys(grouped).sort((a, b) => {
        let idxA = storeOrder.findIndex(s => s.toLowerCase() === a.toLowerCase());
        let idxB = storeOrder.findIndex(s => s.toLowerCase() === b.toLowerCase());
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    sortedStores.forEach(store => {
        const gamesInStore = grouped[store].filter(g => g.Nome.toLowerCase().includes(filter.toLowerCase()));
        if (gamesInStore.length === 0) return;

        const section = document.createElement('div');
        section.className = 'mb-12';
        section.innerHTML = `
            <button class="w-full flex justify-between p-4 bg-gray-900/50 rounded-xl mb-6 border border-gray-800 font-bold uppercase tracking-widest hover:bg-gray-800 transition" 
                    onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span><i class="fas fa-layer-group mr-3 text-blue-500"></i> ${store} <span class="text-blue-500 ml-2">${gamesInStore.length}</span></span>
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                ${gamesInStore.map(game => {
                    const sId = game['Id do jogo'];
                    // Se já tiver ID numérico no JSON, usa direto. Se não, o observer busca depois.
                    const isSteamId = sId && !isNaN(sId) && String(sId).length < 12;
                    const coverUrl = isSteamId ? `https://cdn.akamai.steamstatic.com/steam/apps/${sId}/library_600x900_2x.jpg` : null;

                    return `
                    <div class="game-card cursor-pointer hover:scale-105 transition transform rounded-xl overflow-hidden shadow-2xl aspect-[2/3] relative group bg-[#1e293b] border border-gray-800" 
                         onclick="openDetails('${game.Id}')"
                         data-name="${game.Nome}"
                         data-id="${isSteamId ? sId : ''}">
                        
                        <div class="absolute inset-0 flex items-center justify-center p-4 text-center z-0">
                            <span class="text-gray-600 font-bold uppercase text-[9px] tracking-tighter">${game.Nome}</span>
                        </div>

                        <img src="${coverUrl || ''}" 
                             class="game-img w-full h-full object-cover relative z-10 ${coverUrl ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500" 
                             loading="lazy" 
                             onerror="this.style.opacity='0'">
                    </div>`;
                }).join('')}
            </div>
        `;
        container.appendChild(section);
    });

    startImageObserver();
}

// --- OBSERVADOR (LAZY LOADING) ---
function startImageObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const img = card.querySelector('.game-img');
                const gameName = card.getAttribute('data-name');
                let steamId = card.getAttribute('data-id');

                if (!steamId) {
                    // Delay escalonado para evitar Rate Limit da Steam
                    setTimeout(async () => {
                        steamId = await fetchSteamId(gameName);
                        if (steamId) {
                            card.setAttribute('data-id', steamId); // Salva no card para usar no modal
                            img.src = `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900_2x.jpg`;
                            img.onload = () => img.classList.replace('opacity-0', 'opacity-100');
                        }
                    }, index * 150); 
                }
                observer.unobserve(card);
            }
        });
    }, { rootMargin: "300px" });

    document.querySelectorAll('.game-card').forEach(card => observer.observe(card));
}

// --- MODAL (NOVO LAYOUT) ---
async function openDetails(gameId) {
    const game = gamesData.find(g => g.Id === gameId);
    if (!game) return;

    // Tenta recuperar o ID steam que já foi buscado e salvo no card
    // Isso garante que o modal use o ID certo para os links externos
    const cardElement = document.querySelector(`.game-card[onclick="openDetails('${game.Id}')"]`);
    let sId = cardElement ? cardElement.getAttribute('data-id') : null;
    
    // Se ainda não tiver ID (ex: clicou antes de carregar a imagem), tenta buscar rápido
    if (!sId) sId = await fetchSteamId(game.Nome);

    const modal = document.getElementById('gameModal');
    const content = document.getElementById('modalContent');
    const pcWikiLink = `https://www.pcgamingwiki.com/wiki/${game.Nome.replace(/ /g, '_')}#System_requirements`;

    content.innerHTML = `
        <div class="sticky top-0 bg-[#0f1219]/95 backdrop-blur-md z-50 px-8 py-6 border-b border-gray-800 flex justify-between items-center">
            <div>
                <h2 class="text-2xl md:text-4xl font-black uppercase italic tracking-tighter text-white leading-none">
                    ${game.Nome}
                </h2>
                <span class="text-blue-500 font-bold text-xs uppercase tracking-[0.2em] mt-1 block">${game.Fontes}</span>
            </div>
            <button onclick="closeModal()" class="w-12 h-12 rounded-full bg-gray-800 hover:bg-red-500/20 hover:text-red-500 text-white transition flex items-center justify-center">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <div class="modal-body-scroll p-8 md:p-12">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                
                <div class="space-y-8">
                    <div class="bg-[#151921] p-6 rounded-2xl border border-gray-800 space-y-4">
                        <div>
                            <p class="text-gray-500 uppercase text-[10px] font-black tracking-widest mb-1">Desenvolvedor</p>
                            <p class="text-slate-200 font-bold text-sm">${game.Desenvolvedores || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-gray-500 uppercase text-[10px] font-black tracking-widest mb-1">Gêneros</p>
                            <p class="text-slate-200 font-bold text-sm">${game.Gêneros || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-gray-500 uppercase text-[10px] font-black tracking-widest mb-1">Lançamento</p>
                            <p class="text-slate-200 font-bold text-sm">${game['Data de lançamento'] || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-gray-500 uppercase text-[10px] font-black tracking-widest mb-1">Classificação</p>
                            <p class="text-slate-200 font-bold text-sm">${game['Classificação indicativa'] || 'N/A'}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-green-900/10 border border-green-500/20 p-4 rounded-xl text-center">
                            <p class="text-[10px] text-green-500 uppercase font-bold mb-1">Crítica</p>
                            <p class="text-3xl font-black text-green-400">${game['Avaliação da crítica'] || '--'}</p>
                        </div>
                        <div class="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl text-center">
                            <p class="text-[10px] text-blue-500 uppercase font-bold mb-1">User</p>
                            <p class="text-3xl font-black text-blue-400">${game['Avaliação da comunidade'] || '--'}</p>
                        </div>
                    </div>
                </div>

                <div class="md:col-span-2 space-y-10">
                    <div>
                        <h3 class="text-blue-500 font-black text-xs uppercase tracking-[0.4em] mb-4">Sobre o Jogo</h3>
                        <div class="text-gray-300 leading-relaxed text-lg font-medium bg-[#151921]/50 p-6 rounded-2xl border border-gray-800/50">
                            ${game.Descrição || 'Descrição não disponível.'}
                        </div>
                    </div>

                    <a href="${pcWikiLink}" target="_blank" 
                       class="flex items-center justify-between bg-blue-600/10 p-5 rounded-xl border border-blue-600/20 hover:bg-blue-600/20 transition cursor-pointer group">
                        <div class="flex items-center text-blue-400 font-bold uppercase text-xs tracking-widest group-hover:text-blue-300">
                            <i class="fas fa-microchip mr-4 text-xl"></i> Verificar Requerimentos do Sistema
                        </div>
                        <i class="fas fa-external-link-alt text-blue-500/50"></i>
                    </a>

                    <div>
                         <h3 class="text-gray-500 font-black text-xs uppercase tracking-[0.4em] mb-4">Links Externos</h3>
                         <div class="flex flex-wrap gap-3">
                            <a title="YouTube" href="https://www.youtube.com/results?search_query=${encodeURIComponent(game.Nome)}+gameplay+trailer" target="_blank" class="btn-icon bg-[#FF0000]"><i class="fab fa-youtube"></i></a>
                            <a title="Steam Store" href="https://store.steampowered.com/search/?term=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#171a21]"><i class="fab fa-steam"></i></a>
                            
                            ${sId ? `<a title="SteamDB" href="https://steamdb.info/app/${sId}/" target="_blank" class="btn-icon bg-[#1b2838]"><i class="fas fa-chart-line"></i></a>` : ''}
                            ${sId ? `<a title="ProtonDB" href="https://www.protondb.com/app/${sId}" target="_blank" class="btn-icon bg-[#212121]"><i class="fab fa-linux"></i></a>` : ''}
                            
                            <a title="Co-optimus" href="https://www.co-optimus.com/search.php?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#005596]"><i class="fas fa-users"></i></a>
                            <a title="HowLongToBeat" href="https://howlongtobeat.com/?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#E64A19]"><i class="fas fa-clock"></i></a>
                            <a title="Nexus Mods" href="https://www.nexusmods.com/search/?gsearch=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#da8100]"><i class="fas fa-puzzle-piece"></i></a>
                            <a title="GG Deals" href="https://gg.deals/games/?title=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#004a00]"><i class="fas fa-tag"></i></a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="h-10"></div>
        </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('gameModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}