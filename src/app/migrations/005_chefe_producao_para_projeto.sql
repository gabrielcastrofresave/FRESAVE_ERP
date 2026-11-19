-- O cargo "Chefe de Produção" deixou de existir: quem o tinha passa a "Projeto".
UPDATE public.users SET role = 'projeto' WHERE role = 'chefe_producao';
