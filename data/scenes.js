// Scene registry — define scenes here, no HTML/JS changes needed to add new ones.
// Each scene: id, image path, optional named overlay, buttons array.
//
// Portal destinations: listed in the door scene's `portals` array.
// Each portal entry: { target, label, color }
// The window selector cycles through these; tapping the door enters the selected one.

export const initialScene = 'door';

export const scenes = [
  {
    id: 'door',
    image: 'assets/cockpitDoor.png',
    imageAlt: 'Cockpit Door',
    overlay: 'arch-dial',
    buttons: [
      { type: 'nav',    label: 'Turn Around', className: 'turn-around-btn', target: 'cockpit' },
      { type: 'action', label: 'Linktree',    className: 'bonsai-btn',      action: 'go-linktree', target: 'linktree' }
    ]
  },
  {
    id: 'cockpit',
    image: 'assets/cockpit.png',
    imageAlt: 'Cockpit',
    overlay: 'episode-dial',
    buttons: [
      { type: 'nav', label: 'Turn Around', className: 'turn-around-btn', target: 'door' }
    ]
  },
  {
    id: 'linktree',
    image: 'assets/BonsaiTree.png',
    imageAlt: 'Bonsai Tree',
    overlay: null,
    buttons: [
      { type: 'nav', label: 'Back', className: 'turn-around-btn', target: 'door' }
    ]
  }
];
