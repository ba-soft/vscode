/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposableMap, IDisposable, toDisposable } from 'vs/base/common/lifecycle';
import { Emitter } from 'vs/base/common/event';
import { LinkedList } from 'vs/base/common/linkedList';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IInlineChatService, IInlineChatSessionProvider, CTX_INLINE_CHAT_HAS_PROVIDER, InlineChatProviderChangeEvent } from './inlineChat';

export class InlineChatServiceImpl implements IInlineChatService {

	declare _serviceBrand: undefined;

	private readonly _onDidChangeProviders = new Emitter<InlineChatProviderChangeEvent>();
	private readonly _onDidChangeProvidersEnablementStatus = new Emitter<void>();
	private readonly _providerEventListeners = new DisposableMap<IInlineChatSessionProvider>();
	private readonly _entries = new LinkedList<IInlineChatSessionProvider>();
	private readonly _ctxHasProvider: IContextKey<boolean>;

	readonly onDidChangeProviders = this._onDidChangeProviders.event;
	readonly onDidChangeProvidersEnablementStatus = this._onDidChangeProvidersEnablementStatus.event;

	constructor(@IContextKeyService contextKeyService: IContextKeyService) {
		this._ctxHasProvider = CTX_INLINE_CHAT_HAS_PROVIDER.bindTo(contextKeyService);
	}

	addProvider(provider: IInlineChatSessionProvider): IDisposable {

		const rm = this._entries.push(provider);
		this._ctxHasProvider.set(true);
		this._onDidChangeProviders.fire({ added: provider });
		this._providerEventListeners.set(provider, provider.onDidChangeDisablementStatus(() => this._onDidChangeProvidersEnablementStatus.fire()));

		return toDisposable(() => {
			rm();
			this._providerEventListeners.get(provider)?.dispose();
			this._ctxHasProvider.set(this._entries.size > 0);
			this._onDidChangeProviders.fire({ removed: provider });
		});
	}

	getAllProvider() {
		return [...this._entries].reverse();
	}
}

export function isInlineSessionProvider(obj: unknown): obj is IInlineChatSessionProvider {
	return (obj as IInlineChatSessionProvider)?.prepareInlineChatSession !== undefined;
}
