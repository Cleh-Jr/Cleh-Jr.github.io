// Função principal que roda assim que o site carrega
document.addEventListener('DOMContentLoaded', () => {
    renderLibrary(); // Desenha a biblioteca
    
    // Adiciona o evento de busca
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });
});

// Função que agrupa os jogos por loja (Fonte)
function renderLibrary(filter = "") {
    const container = document.getElementById('libraryContainer');
    container.innerHTML = ''; // Limpa a tela

    // Agrupando os dados do gamesData (que vem do seu arquivo JS)
    const grouped = gamesData.reduce((acc, game) => {
        const store = game.Fontes || "Outros";
        if (!acc[store]) acc[store] = [];
        acc[store].push(game);
        return acc;
    }, {});

    // Para cada loja, criamos uma seção
    for (const store in grouped) {
        const gamesInStore = grouped[store].filter(g => g.Nome.toLowerCase().includes(filter.toLowerCase()));
        
        if (gamesInStore.length === 0) continue;

        const section = document.createElement('div');
        section.className = 'mb-6';
        section.innerHTML = `
            <button class="w-full flex justify-between p-4 bg-gray-900 rounded-xl mb-4 border border-gray-800 font-bold uppercase tracking-tighter hover:bg-gray-800 transition" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span>${store} <span class="text-blue-500 ml-2">${gamesInStore.length}</span></span>
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-2">
                ${gamesInStore.map(game => `
                    <div class="cursor-pointer hover:scale-105 transition transform rounded-lg overflow-hidden bg-gray-700 aspect-[2/3]" onclick="openDetails('${game.Id}')">
                        <img src="${getCover(game)}" class="w-full h-full object-cover" loading="lazy">
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(section);
    }
}

// Lógica para pegar a capa (Prioriza Steam se tiver ID)
function getCover(game) {
    if (game.Fontes === 'Steam' && game['Id do jogo']) {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${game['Id do jogo']}/library_600x900_2x.jpg`;
    }
    return `https://via.placeholder.com/600x900/1a202c/4a5568?text=${encodeURIComponent(game.Nome)}`;
}

// Função para abrir o modal e preencher com seus dados do JSON
function openDetails(gameId) {
    const game = gamesData.find(g => g.Id === gameId);
    if (!game) return;

    const modal = document.getElementById('gameModal');
    const content = document.getElementById('modalContent');

    // Montando o link do PCGamingWiki conforme seu pedido
    const pcWikiLink = `https://www.pcgamingwiki.com/wiki/${game.Nome.replace(/ /g, '_')}#System_requirements`;

    content.innerHTML = `
        <div class="relative h-80">
            <img src="${game.Fontes === 'Steam' ? `https://cdn.akamai.steamstatic.com/steam/apps/${game['Id do jogo']}/library_hero.jpg` : ''}" class="w-full h-full object-cover opacity-30">
            <div class="absolute bottom-0 p-8">
                <h2 class="text-5xl font-black uppercase italic">${game.Nome}</h2>
                <p class="text-blue-400 font-bold mt-2">${game.Fontes} | ${game.Plataformas || 'PC'}</p>
            </div>
        </div>

        <div class="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="space-y-4 text-sm bg-gray-900/50 p-6 rounded-2xl border border-gray-700">
                <p><span class="text-gray-500">Desenvolvedor:</span> <br><strong>${game.Desenvolvedores || 'N/A'}</strong></p>
                <p><span class="text-gray-500">Lançamento:</span> <br><strong>${game['Data de lançamento'] || 'N/A'}</strong></p>
                <p><span class="text-gray-500">Gêneros:</span> <br><strong>${game.Gêneros || 'N/A'}</strong></p>
                <p><span class="text-gray-500">Perspectiva:</span> <br><strong>${game.Perspectiva || 'N/A'}</strong></p>
                <p><span class="text-gray-500">Rating:</span> <br><strong>${game['Classificação indicativa'] || 'N/A'}</strong></p>
                <hr class="border-gray-700">
                <div class="flex justify-between">
                    <div><p class="text-[10px] text-gray-500 uppercase">Metascore</p><p class="text-xl font-black text-green-400">${game['Avaliação da crítica'] || '--'}</p></div>
                    <div><p class="text-[10px] text-gray-500 uppercase">User Score</p><p class="text-xl font-black text-blue-400">${game['Avaliação da comunidade'] || '--'}</p></div>
                </div>
            </div>

            <div class="md:col-span-2 space-y-6">
                <div>
                    <h3 class="text-blue-500 font-black text-xs uppercase tracking-widest mb-2">Descrição</h3>
                    <p class="text-gray-300 leading-relaxed">${game.Descrição || 'Sem descrição.'}</p>
                </div>

                <div class="bg-gray-900/80 p-6 rounded-2xl border border-blue-900/30">
                    <a href="${pcWikiLink}" target="_blank" class="text-blue-400 font-bold uppercase text-xs hover:underline">
                        <i class="fas fa-microchip mr-2"></i> Requerimentos do Sistema (via PCGamingWiki)
                    </a>
                </div>

                <div class="flex flex-wrap gap-4 pt-4">
                    <a title="YouTube Trailer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(game.Nome)}+launch+trailer" target="_blank" class="w-12 h-12 flex items-center justify-center bg-red-600 rounded-xl hover:scale-110 transition"><i class="fab fa-youtube"></i></a>
                    <a title="Steam" href="https://store.steampowered.com/search/?term=${encodeURIComponent(game.Nome)}" target="_blank" class="w-12 h-12 flex items-center justify-center bg-blue-700 rounded-xl hover:scale-110 transition"><i class="fab fa-steam"></i></a>
                    <a title="Co-optimus" href="https://www.co-optimus.com/search.php?q=${encodeURIComponent(game.Nome)}" target="_blank" class="w-12 h-12 flex items-center justify-center bg-blue-400 rounded-xl hover:scale-110 transition"><i class="fas fa-users"></i></a>
                    <a title="HowLongToBeat" href="https://howlongtobeat.com/?q=${encodeURIComponent(game.Nome)}" target="_blank" class="w-12 h-12 flex items-center justify-center bg-orange-600 rounded-xl hover:scale-110 transition"><i class="fas fa-clock"></i></a>
                    <a title="Nexus Mods" href="https://www.nexusmods.com/search/?gsearch=${encodeURIComponent(game.Nome)}" target="_blank" class="w-12 h-12 flex items-center justify-center bg-gray-600 rounded-xl hover:scale-110 transition"><i class="fas fa-puzzle-piece"></i></a>
                    <a title="GG Deals" href="https://gg.deals/games/?title=${encodeURIComponent(game.Nome)}" target="_blank" class="w-12 h-12 flex items-center justify-center bg-green-700 rounded-xl hover:scale-110 transition"><i class="fas fa-tag"></i></a>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Trava o scroll do site ao abrir o modal
}

function closeModal() {
    document.getElementById('gameModal').classList.add('hidden');
    document.body.style.overflow = 'auto'; // Destrava o scroll
}