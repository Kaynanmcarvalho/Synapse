import type { ReactElement } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { FiPhoneCall } from 'react-icons/fi';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { MdOutlineBackup } from 'react-icons/md';
import { TbFileBarcode, TbVersions } from 'react-icons/tb';
import type { IconeDoMenu } from './menu.types';

/** Os ícones do menu Suporte — o único menu com ícone, para o caminho até a
 *  ajuda saltar aos olhos. Vêm do react-icons porque o WhatsApp é marca, e
 *  biblioteca de ícones genéricos não traz marca. */
const ICONES: Readonly<Record<IconeDoMenu, () => ReactElement>> = {
  'whatsapp-telefone': () => (
    <span className="flex items-center gap-1">
      <FaWhatsapp size={17} className="text-[#25d366]" />
      <FiPhoneCall size={14} className="text-primary" />
    </span>
  ),
  chat: () => <HiOutlineChatBubbleLeftRight size={17} className="text-primary" />,
  backup: () => <MdOutlineBackup size={17} className="text-charcoal" />,
  versao: () => <TbVersions size={17} className="text-charcoal" />,
  boleto: () => <TbFileBarcode size={17} className="text-charcoal" />,
};

export function IconeDoMenuItem({ icone }: { readonly icone: IconeDoMenu | undefined }) {
  if (!icone) return null;
  const Icone = ICONES[icone];
  return (
    <span aria-hidden="true" className="flex w-9 shrink-0 items-center justify-center">
      <Icone />
    </span>
  );
}
