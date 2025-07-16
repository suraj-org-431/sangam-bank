const calculateFine = (delayDays, config) => {
    if (delayDays <= 0) return 0;

    for (const rule of config.fineRules || []) {
        if (delayDays <= rule.maxDays) return rule.fineAmount;
    }

    return config.defaultFine || 0;
};
