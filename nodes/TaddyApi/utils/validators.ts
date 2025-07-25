export function validateUuid(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
	try {
		const urlPattern = /^https?:\/\/.+/;
		return urlPattern.test(url);
	} catch {
		return false;
	}
}

export function validateItunesId(itunesId: string): boolean {
	return /^\d+$/.test(itunesId);
}

export function validatePaginationParams(page?: number, limitPerPage?: number): { page: number; limitPerPage: number } {
	const validatedPage = Math.max(1, Math.min(20, page || 1));
	const validatedLimit = Math.max(1, Math.min(25, limitPerPage || 10));
	
	return { page: validatedPage, limitPerPage: validatedLimit };
}

export function validateDateString(dateString: string): boolean {
	const date = new Date(dateString);
	return !isNaN(date.getTime());
}

export function validateDuration(duration: number): boolean {
	return duration > 0 && duration <= 86400; // Max 24 hours in seconds
}

export function validateCountryCode(countryCode: string): boolean {
	// ISO 3166-1 alpha-2 country codes (simplified validation)
	return /^[A-Z]{2}$/.test(countryCode);
}

export function validateLanguageCode(languageCode: string): boolean {
	// ISO 639-1 language codes (simplified validation)
	return /^[a-z]{2}$/.test(languageCode);
}

export function sanitizeSearchTerm(term: string): string {
	// Remove special GraphQL characters and trim
	return term.replace(/["\\\n\r\t]/g, '').trim();
}

export function validateSearchTerm(term: string): boolean {
	const sanitized = sanitizeSearchTerm(term);
	return sanitized.length >= 1 && sanitized.length <= 500;
}

export function validateFilterValues(filters: any): string[] {
	const errors: string[] = [];
	
	if (filters.filterForCountries) {
		filters.filterForCountries.forEach((country: string) => {
			if (!validateCountryCode(country)) {
				errors.push(`Invalid country code: ${country}`);
			}
		});
	}
	
	if (filters.filterForLanguages) {
		filters.filterForLanguages.forEach((language: string) => {
			if (!validateLanguageCode(language)) {
				errors.push(`Invalid language code: ${language}`);
			}
		});
	}
	
	if (filters.filterForSeriesUuids) {
		filters.filterForSeriesUuids.forEach((uuid: string) => {
			if (!validateUuid(uuid)) {
				errors.push(`Invalid UUID: ${uuid}`);
			}
		});
	}
	
	if (filters.filterForPublishedAfter && !validateDateString(filters.filterForPublishedAfter)) {
		errors.push('Invalid published after date format');
	}
	
	if (filters.filterForPublishedBefore && !validateDateString(filters.filterForPublishedBefore)) {
		errors.push('Invalid published before date format');
	}
	
	if (filters.filterForLastUpdatedAfter && !validateDateString(filters.filterForLastUpdatedAfter)) {
		errors.push('Invalid last updated after date format');
	}
	
	if (filters.filterForLastUpdatedBefore && !validateDateString(filters.filterForLastUpdatedBefore)) {
		errors.push('Invalid last updated before date format');
	}
	
	if (filters.filterForDurationLessThan !== undefined && !validateDuration(filters.filterForDurationLessThan)) {
		errors.push('Invalid duration less than value');
	}
	
	if (filters.filterForDurationGreaterThan !== undefined && !validateDuration(filters.filterForDurationGreaterThan)) {
		errors.push('Invalid duration greater than value');
	}
	
	return errors;
}